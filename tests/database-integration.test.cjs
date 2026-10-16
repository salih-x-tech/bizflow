/* eslint-disable @typescript-eslint/no-require-imports -- Opt-in integration runner, isolated from the application process. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { randomBytes } = require("node:crypto");
const { AsyncLocalStorage } = require("node:async_hooks");
const mongoose = require("mongoose");
const { createServerLoader } = require("./helpers/server-loader.cjs");

// Explicit opt-in is mandatory. This suite never uses the application's bizflow
// database, starts no HTTP server, and sends no emails or Cloudinary requests.
test("real MongoDB security and transaction integration", {
  skip: process.env.BIZFLOW_RUN_DB_TESTS !== "1",
  timeout: 240_000,
}, async (context) => {
  require("@next/env").loadEnvConfig(process.cwd(), true, { info() {}, error() {} });
  const uri = process.env.MONGODB_URI;
  assert.ok(uri, "A configured MongoDB connection is required; its value is never printed.");
  const databaseName = `bizflow_qa_${Date.now()}_${randomBytes(6).toString("hex")}`;
  let connected = false;
  // Only the fresh random database owned by this invocation may be cleaned up.
  function assertIsolatedDatabase() {
    assert.ok(/^bizflow_qa_\d+_[a-f0-9]{12}$/.test(databaseName));
    assert.equal(mongoose.connection.name, databaseName, "Refusing to use an application database.");
  }
  context.after(async () => {
    try {
      if (connected) {
        assertIsolatedDatabase();
        const collections = await mongoose.connection.db.collections();
        for (const collection of collections) {
          await collection.deleteMany({});
          assert.equal(await collection.countDocuments({}), 0, "QA fixture cleanup must remove every document.");
        }
        try {
          await mongoose.connection.dropDatabase();
          context.diagnostic("QA fixture cleanup: documents and isolated database removed.");
        } catch (error) {
          if (error?.code !== 13 && error?.code !== 8000) throw error;
          context.diagnostic("QA fixture cleanup: all documents removed; empty database retained because database removal is not permitted.");
        }
      }
    } finally {
      await mongoose.disconnect();
    }
  });
  try {
    await mongoose.connect(uri, { dbName: databaseName, serverSelectionTimeoutMS: 10_000, connectTimeoutMS: 5_000, maxPoolSize: 10 });
    connected = true;
  } catch (error) {
    // Driver diagnostics can contain connection details. Keep the test failure safe.
    const failures = [error, error?.cause, ...Array.from(error?.reason?.servers?.values?.() || []).flatMap(server => [server.error, server.error?.cause])].filter(Boolean);
    const categories = new Set(failures.map(failure => {
      const text = `${failure.code || ""} ${failure.message || ""}`;
      if (/certificate|TLS|SSL/i.test(text)) return "TLS";
      if (/EACCES|EPERM/.test(text)) return "network permission";
      if (/ENOTFOUND|EAI_AGAIN|querySrv/i.test(text)) return "DNS";
      if (/authentication|bad auth/i.test(text)) return "authentication";
      if (/not authorized/i.test(text)) return "database authorization";
      if (/timed?\s*out|ETIMEDOUT/i.test(text)) return "connection timeout";
      if (/ECONNREFUSED/.test(text)) return "connection refused";
      return "server unavailable";
    }));
    throw new Error(`QA database connection failed (${error?.name || "Unknown"}; ${[...categories].join(", ")}); connection details withheld.`);
  }
  assertIsolatedDatabase();
  const cookieContext = new AsyncLocalStorage();
  const load = createServerLoader({ env: { NODE_ENV: "test", APP_URL: "https://bizflow.test" }, doubles: {
    "@/lib/db/connect": { connectDB: async () => { assertIsolatedDatabase(); return mongoose; } },
    "next/headers": { cookies: async () => ({
      get(name) { const value = cookieContext.getStore()?.get(name); return value ? { value } : undefined; },
      set(name, value) { cookieContext.getStore()?.set(name, value); },
      delete(name) { cookieContext.getStore()?.delete(name); },
    }) },
    "@/lib/email/send": { sendEmail: async () => { throw new Error("Email is disabled in integration tests."); } },
  } });
  const model = (name) => load(`src/models/${name}.ts`)[name];
  const service = (file, name) => load(`src/services/${file}.service.ts`)[name];
  const models = Object.fromEntries(["User", "Business", "BusinessMembership", "Category", "Customer", "Product", "Inventory", "InventoryAdjustment", "Order", "Invoice", "AuditLog", "Session", "StaffInvitation", "RateLimit"].map(name => [name, model(name)]));
  await Promise.all(Object.values(models).map(value => value.init()));
  const { User, BusinessMembership, Category, Inventory, InventoryAdjustment, Order, Invoice, AuditLog, Session, StaffInvitation } = models;
  const { hashPassword } = load("src/lib/auth/password.ts");
  const fixturePassword = randomBytes(24).toString("base64url");
  const passwordHash = await hashPassword(fixturePassword);
  const [ownerA, ownerB, staff] = await User.create([
    { name: "QA Owner A", email: "owner-a@qa.invalid", passwordHash },
    { name: "QA Owner B", email: "owner-b@qa.invalid", passwordHash },
    { name: "QA Product Staff", email: "staff@qa.invalid", passwordHash },
  ]);
  const ownerId = ownerA.id, otherOwnerId = ownerB.id, staffId = staff.id;
  const createBusiness = service("business/create-business", "createBusiness");
  const businessA = await createBusiness(ownerId, { name: "QA Tenant A", currency: "PKR", businessType: "Integration QA" });
  const businessB = await createBusiness(otherOwnerId, { name: "QA Tenant B", currency: "PKR", businessType: "Integration QA" });
  const businessId = businessA.id;
  const createCategory = service("category/create-category", "createCategory");
  const createCustomer = service("customer/create-customer", "createCustomer");
  const createProduct = service("product/create-product", "createProduct");
  const createOrder = service("order/create-order", "createOrder");
  const completeOrder = service("order/complete-order", "completeOrder");
  const cancelOrder = service("order/cancel-order", "cancelOrder");
  const updateInventory = service("inventory/update-inventory", "updateInventory");
  const createInvitation = service("staff/create-invitation", "createStaffInvitation");
  const acceptInvitation = service("staff/accept-invitation", "acceptStaffInvitation");
  const updatePermissions = service("staff/update-permissions", "updateStaffPermissions");
  const { createSession, getSession, revokeSession } = load("src/services/auth/session.service.ts");
  const { hashToken } = load("src/lib/auth/tokens.ts");
  const { SESSION_COOKIE_NAME } = load("src/lib/auth/session-config.ts");
  const rejectsCode = (operation, code) => assert.rejects(operation, error => error.code === code);
  const category = await createCategory(ownerId, businessId, { name: "QA Category" });
  const otherCategory = await createCategory(otherOwnerId, businessB.id, { name: "QA Category" });
  const customer = await createCustomer(ownerId, businessId, { name: "QA Customer", email: "customer@qa.invalid" });
  const otherCustomer = await createCustomer(otherOwnerId, businessB.id, { name: "QA Customer", email: "customer@qa.invalid" });
  const product = await createProduct(ownerId, businessId, { name: "QA Product", categoryId: category.id, price: 12.35 });
  const secondProduct = await createProduct(ownerId, businessId, { name: "QA Second Product", categoryId: category.id, price: 2.15 });
  await updateInventory(ownerId, businessId, product.id, { type: "MANUAL_INCREASE", quantity: 10, reason: "QA integration fixture" });
  const token = (await createSession(staff._id)).token;
  const staffCookies = new Map([[SESSION_COOKIE_NAME, token]]);
  async function api(path, { method = "GET", body, params = {}, cookies = staffCookies, query = "" } = {}) {
    const route = load(`src/app/api/businesses/[businessId]${path}/route.ts`);
    const request = new Request(`https://bizflow.test/api/test${query}`, {
      method, headers: { Origin: "https://bizflow.test", "Content-Type": "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    return cookieContext.run(cookies, () => route[method](request, { params: Promise.resolve({ businessId, ...params }) }));
  }
  async function freshOrder(quantity = 2, items) {
    return createOrder(ownerId, businessId, { customerId: customer.id, items: items || [{ productId: product.id, quantity }] });
  }
  async function stock() { return (await Inventory.findOne({ businessId, productId: product.id }).lean()).quantity; }
  async function setStock(quantity) { await Inventory.updateOne({ businessId, productId: product.id }, { $set: { quantity } }); }
  let staffMembershipId;

  await context.test("account profile is session-scoped, private and rejects credential or identity changes", async () => {
    const route = load("src/app/api/account/profile/route.ts");
    async function profileRequest(body, cookies = staffCookies, origin = "https://bizflow.test") {
      return cookieContext.run(cookies, () => body === undefined ? route.GET() : route.PATCH(new Request("https://bizflow.test/api/account/profile", {
        method: "PATCH", headers: { Origin: origin, "Content-Type": "application/json" }, body: JSON.stringify(body),
      })));
    }
    assert.equal((await profileRequest(undefined, new Map())).status, 401);
    const before = (await (await profileRequest()).json()).data.profile;
    assert.deepEqual(Object.keys(before).sort(), ["bio", "createdAt", "email", "name", "phone"]);
    const values = { name: "QA Updated Staff", phone: "+1 (555) 010-0200", bio: "QA profile" };
    assert.equal((await profileRequest(values)).status, 200);
    const after = (await (await profileRequest()).json()).data.profile;
    assert.equal(after.name, values.name);
    assert.equal(after.phone, values.phone);
    assert.equal(after.bio, values.bio);
    assert.equal(after.email, staff.email);
    assert.equal((await User.findById(ownerA._id).lean()).name, ownerA.name);
    for (const extra of [{ userId: ownerId }, { email: "forged@qa.invalid" }, { status: "Disabled" }, { passwordHash: "forged" }, { permissions: ["canManageOrders"] }]) {
      assert.equal((await profileRequest({ ...values, ...extra })).status, 400);
    }
    assert.equal((await profileRequest({ ...values, phone: "<script>" })).status, 400);
    assert.equal((await profileRequest(values, staffCookies, "https://untrusted.test")).status, 403);
    assert.equal((await profileRequest({ name: staff.name, phone: "", bio: "" })).status, 200);
    assert.equal((await User.findById(staff._id).lean()).phone, "");
    const audit = await AuditLog.findOne({ userId: staff._id, action: "PROFILE_UPDATED" }).lean();
    assert.ok(audit && audit.scope === "Account" && !audit.businessId);
    assert.ok(!JSON.stringify(audit.details).includes(values.phone));
  });

  await context.test("login normalizes email, stores only a session hash and rejects a wrong password", async () => {
    const login = service("auth/login", "loginUser");
    const result = await login({ email: " OWNER-A@QA.INVALID ", password: fixturePassword });
    assert.equal((await getSession(result.session.token)).user.id, ownerId);
    const stored = await Session.findOne({ tokenHash: hashToken(result.session.token) }).select("+tokenHash").lean();
    assert.ok(stored && stored.tokenHash !== result.session.token);
    assert.ok(!(await AuditLog.find({ scope: "Account" }).lean()).some(record => JSON.stringify(record).includes(result.session.token)));
    await rejectsCode(login({ email: ownerA.email, password: "incorrect-QA-password" }), "INVALID_CREDENTIALS");
    await revokeSession(result.session.token);
    assert.equal(await getSession(result.session.token), null);
  });

  await context.test("invitation requires the matching email and can be accepted only once", async () => {
    const invitation = await createInvitation(ownerId, businessId, { email: staff.email, permissions: ["canManageProducts"] });
    await rejectsCode(acceptInvitation(otherOwnerId, { token: invitation.token }), "INVALID_INVITATION");
    assert.equal((await StaffInvitation.findById(invitation.invitation.id).lean()).status, "Pending");
    const accepted = await acceptInvitation(staffId, { token: invitation.token });
    staffMembershipId = accepted.membership.id;
    await rejectsCode(acceptInvitation(staffId, { token: invitation.token }), "INVALID_INVITATION");
    assert.equal(await BusinessMembership.countDocuments({ businessId, userId: staff._id }), 1);
  });

  await context.test("product staff can read products/media and only minimal active category lookup", async () => {
    assert.equal((await api("/products")).status, 200);
    assert.equal((await api("/media")).status, 200);
    const response = await api("/categories");
    assert.equal(response.status, 200);
    const row = (await response.json()).data.categories[0];
    assert.deepEqual(Object.keys(row).sort(), ["id", "name"]);
    assert.equal((await api("/categories", { query: "?status=Archived" })).status, 403);
    const detail = await api("/categories/[categoryId]", { params: { categoryId: category.id } });
    assert.equal(detail.status, 200);
    assert.deepEqual(Object.keys((await detail.json()).data.category).sort(), ["id", "name"]);
  });

  await context.test("authenticated product staff is denied every restricted API module", async (permissionsTest) => {
    for (const path of ["/customers", "/inventory", "/inventory/adjustments", "/orders", "/invoices", "/dashboard", "/reports", "/staff", "/staff/invitations", "/audit-logs"]) {
      await permissionsTest.test(path, async () => {
        const response = await api(path);
        assert.equal(response.status, 403);
        assert.equal((await response.json()).error.code, "FORBIDDEN");
      });
    }
    assert.equal((await api("", { method: "PATCH", body: { name: "Denied change" } })).status, 403);
    assert.equal((await api("/categories/[categoryId]", { method: "PATCH", params: { categoryId: category.id }, body: { name: "Denied category change" } })).status, 403);
    assert.equal((await api("/staff/[membershipId]", { method: "PATCH", params: { membershipId: staffMembershipId }, body: { permissions: ["canManageOrders"] } })).status, 403);
  });

  await context.test("a non-member cannot read another tenant even when its IDs are known", async () => {
    const response = await api("/products", { params: { businessId: businessB.id } });
    assert.equal(response.status, 404);
    assert.equal((await response.json()).error.code, "BUSINESS_NOT_FOUND");
    const getCustomer = service("customer/get-customer", "getCustomer");
    await rejectsCode(getCustomer(ownerId, businessB.id, otherCustomer.id), "BUSINESS_NOT_FOUND");
    await rejectsCode(getCustomer(ownerId, businessId, otherCustomer.id), "CUSTOMER_NOT_FOUND");
    await rejectsCode(createProduct(ownerId, businessId, { name: "Wrong category", categoryId: otherCategory.id, price: 1 }), "CATEGORY_NOT_FOUND");
  });

  await context.test("permission removal takes effect with the same still-valid session", async () => {
    await updatePermissions(ownerId, businessId, staffMembershipId, { permissions: [] });
    assert.ok(await getSession(token));
    assert.equal((await api("/products")).status, 403);
    assert.equal((await api("/media")).status, 403);
    await updatePermissions(ownerId, businessId, staffMembershipId, { permissions: ["canManageProducts"] });
    assert.equal((await api("/products")).status, 200);
  });

  await context.test("literal search and duplicate validation preserve tenant boundaries", async () => {
    const listProducts = service("product/list-products", "listProducts");
    assert.equal((await listProducts(ownerId, businessId, { search: ".*" })).products.length, 0);
    await rejectsCode(createCategory(ownerId, businessId, { name: "QA Category" }), "CATEGORY_NAME_ALREADY_EXISTS");
    await rejectsCode(createCustomer(ownerId, businessId, { name: "Duplicate", email: "customer@qa.invalid" }), "CUSTOMER_EMAIL_ALREADY_EXISTS");
    const response = await api("/products", { query: "?search[$ne]=anything" });
    assert.equal(response.status, 400);
  });

  await context.test("pending cancellation and repeated cancellation do not alter stock", async () => {
    const order = await freshOrder();
    const before = await stock();
    await cancelOrder(ownerId, businessId, order.id);
    await rejectsCode(cancelOrder(ownerId, businessId, order.id), "INVALID_ORDER_TRANSITION");
    assert.equal(await stock(), before);
    assert.equal(await Invoice.countDocuments({ orderId: order.id }), 0);
    assert.equal(await InventoryAdjustment.countDocuments({ orderId: order.id }), 0);
  });

  await context.test("order staff completes and voids invoices without invoice-management permission", async () => {
    await updatePermissions(ownerId, businessId, staffMembershipId, { permissions: ["canManageOrders"] });
    const order = await freshOrder();
    const response = await api("/orders/[orderId]/status", { method: "PATCH", params: { orderId: order.id }, body: { status: "Completed" } });
    assert.equal(response.status, 200);
    assert.equal((await api("/invoices")).status, 403);
    assert.equal(await stock(), 8);
    const invoice = await Invoice.findOne({ orderId: order.id }).lean();
    assert.equal(invoice.totalAmount, 24.70);
    await rejectsCode(completeOrder(staffId, businessId, order.id), "INVALID_ORDER_TRANSITION");
    assert.equal(await Invoice.countDocuments({ orderId: order.id }), 1);
    assert.equal(await InventoryAdjustment.countDocuments({ orderId: order.id, type: "ORDER_DEDUCTION" }), 1);
    const cancel = await api("/orders/[orderId]/status", { method: "PATCH", params: { orderId: order.id }, body: { status: "Cancelled" } });
    assert.equal(cancel.status, 200);
    await rejectsCode(cancelOrder(staffId, businessId, order.id), "INVALID_ORDER_TRANSITION");
    assert.equal(await stock(), 10);
    assert.equal((await Invoice.findById(invoice._id).lean()).status, "Voided");
    assert.equal(await InventoryAdjustment.countDocuments({ orderId: order.id, type: "ORDER_REVERSAL" }), 1);
  });

  await context.test("invoice failure rolls back inventory, adjustments, audits and order status", async () => {
    const order = await freshOrder(), before = await stock(), beforeAudits = await AuditLog.countDocuments({ businessId });
    const original = Invoice.create;
    Invoice.create = async () => { throw new Error("QA injected invoice failure"); };
    try { await assert.rejects(completeOrder(ownerId, businessId, order.id), /QA injected invoice failure/); }
    finally { Invoice.create = original; }
    assert.equal(await stock(), before);
    assert.equal((await Order.findById(order.id).lean()).status, "Pending");
    assert.equal(await InventoryAdjustment.countDocuments({ orderId: order.id }), 0);
    assert.equal(await Invoice.countDocuments({ orderId: order.id }), 0);
    assert.equal(await AuditLog.countDocuments({ businessId }), beforeAudits);
  });

  await context.test("audit failure after invoice insertion rolls back the entire completion", async () => {
    const order = await freshOrder(), before = await stock();
    const original = AuditLog.create;
    AuditLog.create = async function(records, ...args) {
      if (records.some(record => record.action === "ORDER_COMPLETED")) throw new Error("QA injected audit failure");
      return original.call(this, records, ...args);
    };
    try { await assert.rejects(completeOrder(ownerId, businessId, order.id), /QA injected audit failure/); }
    finally { AuditLog.create = original; }
    assert.equal(await stock(), before);
    assert.equal((await Order.findById(order.id).lean()).status, "Pending");
    assert.equal(await InventoryAdjustment.countDocuments({ orderId: order.id }), 0);
    assert.equal(await Invoice.countDocuments({ orderId: order.id }), 0);
  });

  await context.test("a later insufficient item rolls back earlier item deductions", async () => {
    const order = await freshOrder(1, [{ productId: product.id, quantity: 1 }, { productId: secondProduct.id, quantity: 1 }]);
    const before = await stock();
    await rejectsCode(completeOrder(ownerId, businessId, order.id), "INSUFFICIENT_STOCK");
    assert.equal(await stock(), before);
    assert.equal(await InventoryAdjustment.countDocuments({ orderId: order.id }), 0);
    assert.equal((await Order.findById(order.id).lean()).status, "Pending");
  });

  await context.test("catalog changes preserve historical prices and printable invoice escapes customer HTML", async () => {
    const hostileName = '<script>alert("qa")</script>';
    const updateCustomer = service("customer/update-customer", "updateCustomer");
    const updateProduct = service("product/update-product", "updateProduct");
    await updateCustomer(ownerId, businessId, customer.id, { name: hostileName });
    const order = await freshOrder();
    const completed = await completeOrder(ownerId, businessId, order.id);
    await updateProduct(ownerId, businessId, product.id, { price: 99.99, name: "QA Updated Product" });
    const savedOrder = await Order.findById(order.id).lean();
    const savedInvoice = await Invoice.findById(completed.invoice.id).lean();
    assert.equal(savedOrder.items[0].unitPriceAtOrder, 12.35);
    assert.equal(savedInvoice.itemsSnapshot[0].unitPriceAtOrder, 12.35);
    assert.equal(savedInvoice.totalAmount, 24.70);
    const ownerSession = (await createSession(ownerA._id)).token;
    const response = await api("/invoices/[invoiceId]/print", { params: { invoiceId: completed.invoice.id }, cookies: new Map([[SESSION_COOKIE_NAME, ownerSession]]) });
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-security-policy"), /script-src 'none'/);
    const html = await response.text();
    assert.ok(!html.includes(hostileName));
    assert.match(html, /&lt;script&gt;/);
    await cancelOrder(ownerId, businessId, order.id);
    await updateCustomer(ownerId, businessId, customer.id, { name: "QA Customer" });
    await updateProduct(ownerId, businessId, product.id, { price: 12.35, name: "QA Product" });
    await revokeSession(ownerSession);
  });

  await context.test("concurrent completion of the same order creates one invoice and deduction", async () => {
    const order = await freshOrder();
    const results = await Promise.allSettled([completeOrder(ownerId, businessId, order.id), completeOrder(ownerId, businessId, order.id)]);
    assert.equal(results.filter(result => result.status === "fulfilled").length, 1);
    assert.equal(results.filter(result => result.status === "rejected" && result.reason.code === "INVALID_ORDER_TRANSITION").length, 1);
    assert.equal(await stock(), 8);
    assert.equal(await Invoice.countDocuments({ orderId: order.id }), 1);
    assert.equal(await InventoryAdjustment.countDocuments({ orderId: order.id, type: "ORDER_DEDUCTION" }), 1);
    await cancelOrder(ownerId, businessId, order.id);
  });

  await context.test("competing orders cannot oversell stock", async () => {
    await setStock(8);
    const first = await freshOrder(5), second = await freshOrder(5);
    const results = await Promise.allSettled([completeOrder(ownerId, businessId, first.id), completeOrder(ownerId, businessId, second.id)]);
    assert.equal(results.filter(result => result.status === "fulfilled").length, 1);
    assert.equal(results.filter(result => result.status === "rejected" && result.reason.code === "INSUFFICIENT_STOCK").length, 1);
    assert.equal(await stock(), 3);
    assert.equal(await Invoice.countDocuments({ orderId: { $in: [first.id, second.id] } }), 1);
    for (const order of [first, second]) await cancelOrder(ownerId, businessId, order.id);
    assert.equal(await stock(), 8);
  });

  await context.test("removing staff revokes business access without invalidating unrelated account authentication", async () => {
    await service("staff/remove-staff", "removeStaff")(ownerId, businessId, staffMembershipId);
    assert.ok(await getSession(token));
    assert.equal((await api("/products")).status, 404);
    assert.equal((await BusinessMembership.findById(staffMembershipId).lean()).status, "Revoked");
  });

  await context.test("expired, revoked and disabled-user sessions cannot authenticate APIs", async () => {
    await revokeSession(token);
    assert.equal(await getSession(token), null);
    assert.equal((await api("/products")).status, 401);
    const expiring = (await createSession(staff._id)).token;
    await Session.updateOne({ tokenHash: hashToken(expiring) }, { $set: { expiresAt: new Date(0) } });
    assert.equal(await getSession(expiring), null);
    const disabled = (await createSession(staff._id)).token;
    await User.updateOne({ _id: staff._id }, { $set: { status: "Disabled" } });
    assert.equal(await getSession(disabled), null);
    assert.equal(await getSession("malformed"), null);
  });

  assert.equal(await Category.countDocuments({ businessId: businessB.id }), 1);
});
