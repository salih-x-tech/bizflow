/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS is required by the isolated TypeScript module loader used in these Node tests. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

// Load server TypeScript with explicit dependency doubles, without reading env files
// or connecting to a database. These tests cover the new service contracts.
function load(file, doubles = {}) {
  const resolved = path.join(__dirname, "..", file);
  const code = ts.transpileModule(fs.readFileSync(resolved, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const loadedModule = { exports: {} };
  function dependency(name) {
    if (name === "server-only") return {};
    if (Object.hasOwn(doubles, name)) return doubles[name];
    if (name.startsWith("@/lib/validation/") || name === "@/lib/auth/tokens" || name === "@/lib/auth/password" || name === "@/lib/errors") return load(`src/${name.slice(2)}.ts`, doubles);
    if (name.startsWith("@/")) throw new Error(`Missing dependency double: ${name}`);
    return require(name);
  }
  vm.runInNewContext(code, { require: dependency, module: loadedModule, exports: loadedModule.exports, Date, URL, Buffer, TextEncoder, process: { env: { APP_URL: "https://bizflow.example", NODE_ENV: "test" } } }, { filename: resolved });
  return loadedModule.exports;
}

function forgotFixture({ account = true, emailFailure = false, auditFailure = false } = {}) {
  const stored = [], audits = [], rates = [], emails = [], sessions = [];
  const session = { id: "transaction" };
  const doubles = {
    "@/lib/db/connect": { connectDB: async () => ({ connection: { transaction: async (callback) => callback(session) } }) },
    "@/lib/auth/rate-limit": { consumeRateLimit: async (input) => rates.push(input) },
    "@/lib/email/send": { sendEmail: async (input) => { emails.push(input); if (emailFailure) throw new Error("provider details must stay private"); } },
    "@/models/User": { User: { findOne: (filter) => { assert.equal(filter.email, "person@example.com"); assert.equal(filter.status, "Active"); return { select: () => ({ lean: async () => account ? { _id: "user" } : null }) }; } } },
    "@/models/PasswordResetToken": { PasswordResetToken: { init: async () => {}, create: async (records, options) => { stored.push(...records); sessions.push(options.session); } } },
    "@/models/AuditLog": { AuditLog: { init: async () => {}, create: async (records, options) => { audits.push(...records); sessions.push(options.session); if (auditFailure) throw new Error("audit unavailable"); } } },
  };
  return { service: load("src/services/auth/forgot-password.service.ts", doubles).forgotPassword, stored, audits, rates, emails, sessions, session };
}

test("forgot password normalizes email, hashes tokens, and shares a transaction with account audit", async () => {
  const fixture = forgotFixture();
  const before = Date.now();
  const result = await fixture.service({ email: " Person@Example.com " });
  assert.match(result.message, /If an active account/);
  assert.equal(fixture.stored.length, 1);
  const token = new URL(fixture.emails[0].text.match(/https:\/\/\S+/)[0]).searchParams.get("token");
  const { hashToken } = load("src/lib/auth/tokens.ts");
  assert.equal(fixture.stored[0].tokenHash, hashToken(token));
  assert.ok(!JSON.stringify(fixture.stored).includes(token));
  assert.ok(!JSON.stringify(fixture.audits).includes(token));
  assert.equal(fixture.audits[0].scope, "Account");
  assert.equal(fixture.audits[0].businessId, undefined);
  assert.ok(fixture.sessions.every((session) => session === fixture.session));
  assert.ok(fixture.stored[0].expiresAt.getTime() >= before + 30 * 60 * 1000);
  assert.notEqual(fixture.rates[0].identifier, "person@example.com");
});

test("forgot password gives the same result for absent accounts and unconfirmed email delivery", async () => {
  const absent = forgotFixture({ account: false });
  const failure = forgotFixture({ emailFailure: true });
  assert.equal((await absent.service({ email: "person@example.com" })).message, (await failure.service({ email: "person@example.com" })).message);
  assert.equal(absent.stored.length, 0);
  assert.equal(absent.emails.length, 0);
});

test("failed reset audit prevents email and retains the generic response", async () => {
  const fixture = forgotFixture({ auditFailure: true });
  assert.match((await fixture.service({ email: "person@example.com" })).message, /If an active account/);
  assert.equal(fixture.emails.length, 0);
});

test("purchase history authorizes the customer before querying and scopes both queries", async () => {
  const businessId = "111111111111111111111111", customerId = "222222222222222222222222";
  const filters = [];
  let skip, limit, authorized = false;
  const query = { select() { return this; }, sort() { return this; }, skip(value) { skip = value; return this; }, limit(value) { limit = value; return this; }, lean: async () => [{ _id: "order", status: "Completed", totalAmount: 15, createdAt: new Date(), items: [{ productNameSnapshot: "Saved name", quantity: 3, unitPriceAtOrder: 5, lineTotal: 15 }] }] };
  const doubles = {
    "@/services/customer/get-customer.service": { getCustomer: async (user, business, customer) => { assert.equal(user, "actor"); assert.equal(business, businessId); assert.equal(customer, customerId); authorized = true; return { id: customerId, businessId }; } },
    "@/models/Order": { Order: { find: (filter) => { assert.ok(authorized); filters.push(filter); return query; }, countDocuments: async (filter) => { filters.push(filter); return 21; } } },
  };
  const service = load("src/services/customer/purchase-history.service.ts", doubles).getCustomerPurchaseHistory;
  const result = await service("actor", businessId, customerId, { page: "2" });
  assert.equal(skip, 20); assert.equal(limit, 20);
  for (const filter of filters) { assert.equal(filter.businessId.toString(), businessId); assert.equal(filter.customerId.toString(), customerId); }
  assert.equal(result.pagination.totalPages, 2);
  assert.equal(result.orders[0].items[0].name, "Saved name");
  assert.equal(result.orders[0].items[0].unitPrice, 5);
  doubles["@/services/customer/get-customer.service"].getCustomer = async () => { throw new Error("forbidden"); };
  filters.length = 0;
  await assert.rejects(service("actor", businessId, customerId, {}), /forbidden/);
  assert.equal(filters.length, 0);
});

test("media lookups hide pending deletion by default and validate opt-in", () => {
  const { listMediaQuerySchema } = load("src/lib/validation/media.ts");
  assert.equal(listMediaQuerySchema.parse({}).includeDeleting, false);
  assert.equal(listMediaQuerySchema.parse({ includeDeleting: "true" }).includeDeleting, true);
  assert.throws(() => listMediaQuerySchema.parse({ includeDeleting: "yes" }));
});

test("customer editing clears optional fields without overwriting omitted fields", async () => {
  const businessId = "111111111111111111111111", customerId = "222222222222222222222222";
  const { Types } = require("mongoose");
  const businessObjectId = new Types.ObjectId(businessId), customerObjectId = new Types.ObjectId(customerId);
  let update;
  const audits = [];
  const session = {};
  const doubles = {
    "@/lib/db/connect": { connectDB: async () => ({ connection: { transaction: async (callback) => callback(session) } }) },
    "@/services/business/business-access.service": { requireBusinessAccess: async (user, business, permission) => { assert.equal(permission, "canManageCustomers"); return { business: { _id: businessObjectId }, membership: { userId: "actor" } }; } },
    "@/services/business/transaction-permission.service": { assertTransactionPermission: async (user, business, permission, receivedSession) => { assert.equal(permission, "canManageCustomers"); assert.equal(receivedSession, session); } },
    "@/models/Customer": { Customer: {
      init: async () => {},
      findOne: (filter) => { assert.equal(filter.businessId.toString(), businessId); return { select: () => ({ session: () => ({ lean: async () => ({ status: "Active" }) }) }) }; },
      findOneAndUpdate: async (filter, payload, options) => { assert.equal(filter._id.toString(), customerId); assert.equal(filter.businessId.toString(), businessId); assert.equal(options.session, session); update = payload; return { _id: customerObjectId, businessId: businessObjectId, name: "Customer", status: "Active" }; },
    } },
    "@/models/AuditLog": { AuditLog: { init: async () => {}, create: async (records, options) => { assert.equal(options.session, session); audits.push(...records); } } },
  };
  const { updateCustomer } = load("src/services/customer/update-customer.service.ts", doubles);
  await updateCustomer("actor", businessId, customerId, { email: "", phone: " ", address: "New address" });
  assert.equal(update.$unset.email, "");
  assert.equal(update.$unset.phone, "");
  assert.equal(update.$set.address, "New address");
  assert.equal(update.$unset.notes, undefined);
  assert.equal(audits[0].action, "CUSTOMER_UPDATED");
});

test("media gallery opt-in retains business scope and product permission", async () => {
  const filters = [];
  const query = { select() { return this; }, sort() { return this; }, skip() { return this; }, limit() { return this; }, lean: async () => [] };
  const doubles = {
    "@/services/business/business-access.service": { requireBusinessAccess: async (user, businessId, permission) => { assert.equal(permission, "canManageProducts"); return { business: { _id: businessId } }; } },
    "@/models/Media": { Media: { find: (filter) => { filters.push(filter); return query; }, countDocuments: async (filter) => { filters.push(filter); return 0; } } },
  };
  const { listMedia } = load("src/services/media/list-media.service.ts", doubles);
  await listMedia("actor", "business", {});
  assert.equal(filters[0].businessId, "business");
  assert.equal(filters[0].status.$ne, "Deleting");
  filters.length = 0;
  await listMedia("actor", "business", { includeDeleting: "true" });
  assert.equal(filters[0].businessId, "business");
  assert.equal(filters[0].status, undefined);
});
