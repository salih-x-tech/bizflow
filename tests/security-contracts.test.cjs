/* eslint-disable @typescript-eslint/no-require-imports -- Node's CommonJS test runner. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { Types } = require("mongoose");
const { createServerLoader } = require("./helpers/server-loader.cjs");

function accessFixture() {
  const actor = new Types.ObjectId(), business = new Types.ObjectId();
  const state = { membership: { userId: actor, role: "Staff", permissions: ["canManageProducts"] }, activeUser: true, ownerId: actor };
  function query(value) { return { select() { return this; }, session() { return this; }, lean: async () => value }; }
  const load = createServerLoader({ env: { APP_URL: "https://bizflow.example" }, doubles: {
    "@/lib/db/connect": { connectDB: async () => {} },
    "@/lib/auth/require-user": { requireUser: async () => ({ id: actor.toString() }) },
    "@/lib/auth/rate-limit": { consumeRateLimit: async () => {} },
    "@/models/BusinessMembership": { BusinessMembership: { findOne(filter) {
      assert.equal(filter.businessId.toString(), business.toString());
      assert.equal(filter.userId.toString(), actor.toString());
      assert.equal(filter.status, "Active");
      return query(state.membership);
    } } },
    "@/models/Business": { Business: { findById: () => query({ _id: business, ownerId: state.ownerId }) } },
    "@/models/User": { User: { exists: () => ({ session: async () => state.activeUser ? { _id: actor } : null }) } },
  } });
  return { actor, business, state, load,
    access: load("src/services/business/business-access.service.ts").requireBusinessAccess,
    transactionAccess: load("src/services/business/transaction-permission.service.ts").assertTransactionPermission,
    owner: load("src/services/business/business-owner.service.ts").requireBusinessOwner };
}

const rejectsCode = (operation, code) => assert.rejects(operation, error => error.code === code);

test("profile route derives identity from authentication and limits same-origin writes", async () => {
  const actor = new Types.ObjectId().toString();
  let signedIn = true;
  const calls = [];
  const load = createServerLoader({ env: { APP_URL: "https://bizflow.example" }, doubles: {
    "@/lib/auth/require-user": { requireUser: async () => {
      if (!signedIn) throw new (load("src/lib/errors.ts").AppError)("UNAUTHENTICATED", "Log in.", 401);
      return { id: actor };
    } },
    "@/lib/auth/rate-limit": { consumeRateLimit: async (input) => calls.push(["limit", input.identifier]) },
    "@/services/auth/profile.service": {
      getProfile: async (id) => { calls.push(["read", id]); return { name: "QA" }; },
      updateProfile: async (id) => { calls.push(["write", id]); return { message: "Saved" }; },
    },
  } });
  const route = load("src/app/api/account/profile/route.ts");
  assert.equal((await route.GET()).status, 200);
  const request = (origin) => new Request("https://bizflow.example/api/account/profile", {
    method: "PATCH", headers: { Origin: origin, "Content-Type": "application/json" }, body: "{}",
  });
  assert.equal((await route.PATCH(request("https://untrusted.example"))).status, 403);
  assert.equal(calls.length, 1);
  assert.equal((await route.PATCH(request("https://bizflow.example"))).status, 200);
  assert.deepEqual(calls, [["read", actor], ["limit", actor], ["write", actor]]);
  signedIn = false;
  assert.equal((await route.GET()).status, 401);
  assert.equal((await route.PATCH(request("https://bizflow.example"))).status, 401);
  assert.equal(calls.length, 3);
});

test("staff authorization is re-read after a grant is revoked and cannot confer owner access", async () => {
  const f = accessFixture(), actor = f.actor.toString(), business = f.business.toString();
  await f.access(actor, business, "canManageProducts");
  await rejectsCode(f.access(actor, business, "canManageOrders"), "FORBIDDEN");
  await rejectsCode(f.owner(actor, business), "FORBIDDEN");
  f.state.membership.permissions = [];
  await rejectsCode(f.access(actor, business, "canManageProducts"), "FORBIDDEN");
  f.state.membership = null;
  await rejectsCode(f.access(actor, business), "BUSINESS_NOT_FOUND");
});

test("transaction authorization rejects permission removal, inactive users and forged ownership", async () => {
  const f = accessFixture(), session = {};
  await f.transactionAccess(f.actor, f.business, "canManageProducts", session);
  f.state.membership.permissions = [];
  await rejectsCode(f.transactionAccess(f.actor, f.business, "canManageProducts", session), "FORBIDDEN");
  f.state.membership.role = "Owner";
  f.state.ownerId = new Types.ObjectId();
  await rejectsCode(f.transactionAccess(f.actor, f.business, "canManageProducts", session), "FORBIDDEN");
  f.state.activeUser = false;
  await rejectsCode(f.transactionAccess(f.actor, f.business, "canManageProducts", session), "UNAUTHENTICATED");
});

test("invalid identifiers are rejected before a database query", async () => {
  const f = accessFixture();
  await rejectsCode(f.access('{"$ne":null}', f.business.toString()), "UNAUTHENTICATED");
  await rejectsCode(f.access(f.actor.toString(), '{"$ne":null}'), "INVALID_BUSINESS_ID");
});

test("real API handlers enforce restrictions for a Products-only authenticated actor", async (context) => {
  const f = accessFixture();
  // The session adapter and membership storage are doubles here. The route
  // handler, authorization services, and error serializer are real modules.
  for (const path of ["/customers", "/inventory", "/inventory/adjustments", "/orders", "/invoices", "/dashboard", "/reports", "/staff", "/staff/invitations", "/audit-logs"]) {
    await context.test(path, async () => {
      const route = f.load(`src/app/api/businesses/[businessId]${path}/route.ts`);
      const response = await route.GET(new Request("https://bizflow.example/api/test"), { params: Promise.resolve({ businessId: f.business.toString() }) });
      assert.equal(response.status, 403);
      assert.equal((await response.json()).error.code, "FORBIDDEN");
    });
  }
});

test("origin enforcement rejects missing, cross-site and lookalike origins", () => {
  const load = createServerLoader({ env: { APP_URL: "https://bizflow.example" } });
  const { assertTrustedOrigin } = load("src/lib/api/origin.ts");
  assert.doesNotThrow(() => assertTrustedOrigin(new Request("https://bizflow.example/api", { headers: { Origin: "https://bizflow.example" } })));
  for (const headers of [{}, { Origin: "https://bizflow.example.evil.test" }, { Origin: "https://bizflow.example", "Sec-Fetch-Site": "cross-site" }]) {
    assert.throws(() => assertTrustedOrigin(new Request("https://bizflow.example/api", { headers })), error => error.code === "UNTRUSTED_ORIGIN");
  }
});

test("production session cookie requires HTTP-only, secure and host-only scope", () => {
  const load = createServerLoader({ env: { NODE_ENV: "production" } });
  const config = load("src/lib/auth/session-config.ts");
  const options = config.getSessionCookieOptions(new Date());
  assert.equal(config.SESSION_COOKIE_NAME, "__Host-bizflow_session");
  assert.equal(options.httpOnly, true);
  assert.equal(options.secure, true);
  assert.equal(options.sameSite, "lax");
  assert.equal(options.path, "/");
  assert.equal(Object.hasOwn(options, "domain"), false);
});

test("unexpected API failures never expose provider messages or stack traces", async () => {
  const load = createServerLoader();
  const { apiError } = load("src/lib/api/response.ts");
  const response = apiError(new Error("private provider credential and connection string"));
  assert.equal(response.status, 500);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), { success: false, error: { code: "INTERNAL_ERROR", message: "Something went wrong. Please try again.", details: [] } });
});

test("request parsing accepts valid JSON and rejects malformed, invalid UTF-8 and oversized bodies", async () => {
  const load = createServerLoader();
  const { readJsonBody } = load("src/lib/api/request.ts");
  const request = body => new Request("https://bizflow.example/api/test", { method: "POST", headers: { "Content-Type": "application/json" }, body });
  assert.equal((await readJsonBody(request('{"name":"QA"}'))).name, "QA");
  await rejectsCode(readJsonBody(request("{")), "INVALID_JSON");
  await rejectsCode(readJsonBody(request(new Uint8Array([0xff]))), "INVALID_JSON");
  await rejectsCode(readJsonBody(request(JSON.stringify({ name: "x".repeat(16 * 1024) }))), "PAYLOAD_TOO_LARGE");
});

test("invoice HTML escapes hostile contact, item and reference text", () => {
  const load = createServerLoader();
  const { renderInvoiceHtml } = load("src/services/invoice/render-invoice-html.service.ts");
  const hostile = '<img src=x onerror="alert(1)">';
  const html = renderInvoiceHtml({
    invoiceNumber: hostile, orderId: hostile, currency: "PKR", status: "Voided",
    issuedAt: new Date(0), voidedAt: new Date(1),
    businessSnapshot: { name: hostile, address: hostile },
    customerSnapshot: { name: hostile, email: hostile, phone: hostile },
    itemsSnapshot: [{ productNameSnapshot: hostile, quantity: 1, unitPriceAtOrder: 12.35, lineTotal: 12.35 }],
    subtotal: 12.35, totalAmount: 12.35,
  });
  assert.ok(!html.includes(hostile));
  assert.match(html, /&lt;img src=x onerror=&quot;alert\(1\)&quot;&gt;/);
  assert.match(html, /VOIDED/);
  assert.match(html, /12\.35/);
});

test("development diagnostic routes return 404 in production before side effects", async (context) => {
  const load = createServerLoader({ env: { NODE_ENV: "production" }, doubles: {
    "@/lib/db/connect": { connectDB: async () => { throw new Error("Database must not be called."); } },
    "@/lib/db/initialize": { initializeDevelopmentDatabase: async () => { throw new Error("Setup must not be called."); } },
    "@/lib/auth/require-user": { requireUser: async () => { throw new Error("Authentication must not be called."); } },
    "@/lib/email/send": { sendEmail: async () => { throw new Error("Email must not be called."); }, verifyEmailConnection: async () => { throw new Error("Email must not be called."); } },
  } });
  for (const [name, method] of [["db-check", "GET"], ["db-setup", "POST"], ["transaction-check", "POST"], ["email-check", "POST"]]) {
    await context.test(name, async () => {
      const route = load(`src/app/api/dev/${name}/route.ts`);
      const response = await route[method](new Request(`https://bizflow.example/api/dev/${name}`, { method }));
      assert.equal(response.status, 404);
    });
  }
});
