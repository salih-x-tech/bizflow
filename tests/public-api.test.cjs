/* eslint-disable @typescript-eslint/no-require-imports -- Node's standalone CommonJS test runner. */
const { test } = require("node:test");
const assert = require("node:assert/strict");

const baseUrl = process.env.BIZFLOW_QA_BASE_URL;
// These tests make no authenticated requests and create no records. The server
// must be started separately; opt in explicitly to avoid probing arbitrary hosts.
const options = { skip: !baseUrl };
const business = "111111111111111111111111";
const record = "222222222222222222222222";

test("protected APIs reject requests without a session", options, async (context) => {
  const routes = [
    "/api/auth/me", "/api/businesses", "/api/account/profile",
    ...[
      "", "/customers", `/customers/${record}`, "/categories", `/categories/${record}`,
      "/products", `/products/${record}`, "/inventory", "/inventory/adjustments",
      "/orders", `/orders/${record}`, "/invoices", `/invoices/${record}`,
      `/invoices/${record}/print`, "/dashboard", "/reports", "/media",
      `/media/${record}`, "/staff", "/staff/invitations", "/audit-logs",
    ].map((suffix) => `/api/businesses/${business}${suffix}`),
  ];
  for (const route of routes) {
    await context.test(`GET ${route}`, async () => {
      const response = await fetch(new URL(route, baseUrl));
      assert.equal(response.status, 401);
      const body = await response.json();
      assert.equal(body.success, false);
      assert.equal(body.error.code, "UNAUTHENTICATED");
      assert.match(response.headers.get("cache-control"), /no-store/);
    });
  }
});

test("untrusted origins are rejected before mutations", options, async (context) => {
  const cases = [
    ["PATCH", "/api/account/profile"],
    ["POST", "/api/auth/login"], ["POST", "/api/auth/register"],
    ["POST", "/api/auth/forgot-password"], ["POST", "/api/auth/reset-password"],
    ["POST", "/api/auth/logout"], ["POST", "/api/staff-invitations/accept"],
    ["POST", "/api/businesses"],
    ["PATCH", `/api/businesses/${business}`],
    ["POST", `/api/businesses/${business}/customers`],
    ["PATCH", `/api/businesses/${business}/customers/${record}`],
    ["DELETE", `/api/businesses/${business}/customers/${record}`],
    ["POST", `/api/businesses/${business}/categories`],
    ["POST", `/api/businesses/${business}/products`],
    ["PATCH", `/api/businesses/${business}/inventory/${record}`],
    ["POST", `/api/businesses/${business}/orders`],
    ["PATCH", `/api/businesses/${business}/orders/${record}/status`],
    ["POST", `/api/businesses/${business}/media`],
    ["DELETE", `/api/businesses/${business}/media/${record}`],
    ["POST", `/api/businesses/${business}/staff/invitations`],
    ["PATCH", `/api/businesses/${business}/staff/${record}`],
    ["DELETE", `/api/businesses/${business}/staff/${record}`],
    ["PATCH", `/api/businesses/${business}/staff/invitations/${record}`],
  ];
  for (const [method, route] of cases) {
    await context.test(`${method} ${route}`, async () => {
      const response = await fetch(new URL(route, baseUrl), {
        method,
        headers: { Origin: "https://untrusted.example", "Content-Type": "application/json" },
        body: "{}",
      });
      assert.equal(response.status, 403);
      const body = await response.json();
      assert.equal(body.success, false);
      assert.equal(body.error.code, "UNTRUSTED_ORIGIN");
    });
  }
});
