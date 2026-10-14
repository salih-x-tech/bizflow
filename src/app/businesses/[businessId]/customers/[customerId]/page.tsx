import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EditCustomerForm } from "@/components/customer/edit-customer-form";
import { requirePageUser } from "@/lib/auth/require-page-user";
import { AppError } from "@/lib/errors";
import { getCustomer } from "@/services/customer/get-customer.service";
import { CustomerStatusControl } from "@/components/customer/customer-status-control";
import { getCustomerPurchaseHistory } from "@/services/customer/purchase-history.service";
import { requireBusinessAccess } from "@/services/business/business-access.service";
import { Panel, DataTable, Pager, money, utc } from "@/components/workspace/data-view";
import { queryValues, pageError } from "@/lib/workspace-page";


export const metadata: Metadata = {
  title: "Customer details",
};

type CustomerPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
  params: Promise<{
    businessId: string;
    customerId: string;
  }>;
};

export default async function CustomerPage({
  params,
  searchParams,
}: CustomerPageProps) {
  const user = await requirePageUser();
  const { businessId, customerId } = await params;

  const customer = await getCustomer(
    user.id,
    businessId,
    customerId,
  ).catch((error: unknown) => {
    if (error instanceof AppError) {
      if (
        error.code === "BUSINESS_NOT_FOUND" ||
        error.code === "INVALID_BUSINESS_ID" ||
        error.code === "CUSTOMER_NOT_FOUND" ||
        error.code === "INVALID_CUSTOMER_ID"
      ) {
        notFound();
      }

      if (error.statusCode === 403) return null;
    }

    throw error;
  });

  if (!customer) {
    return (
      <section className="glass-panel space-y-4 p-6">
        <h1 className="text-2xl font-semibold">
          Customer access required
        </h1>

        <p className="text-muted leading-7">
          Ask your business owner for customer management
          permission.
        </p>

        <Link
          href={`/businesses/${businessId}`}
          className="secondary-button"
        >
          Back to overview
        </Link>
      </section>
    );
  }

  const { business } = await requireBusinessAccess(user.id, businessId, "canManageCustomers");
  const query = queryValues(await searchParams, ["page"]);
  const history = await getCustomerPurchaseHistory(user.id, businessId, customerId, query).catch((error: unknown) => pageError(error));
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <Link
        href={`/businesses/${businessId}/customers`}
        className="inline-block rounded text-sm font-medium text-indigo-300 underline-offset-4 hover:underline"
      >
        ← Back to customers
      </Link>

      <section
        aria-labelledby="customer-heading"
        className="glass-panel p-6 sm:p-10"
      >
        <header className="mb-8 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h1
              id="customer-heading"
              className="min-w-0 break-words text-2xl font-semibold tracking-tight sm:text-3xl"
            >
              {customer.name}
            </h1>

            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                customer.status === "Active"
                  ? "bg-emerald-500/15 text-emerald-200"
                  : "bg-amber-500/15 text-amber-200"
              }`}
            >
              {customer.status}
            </span>
          </div>

          <p className="text-muted text-sm leading-6">
            Update this customer’s contact details and notes.
          </p>
        </header>

        <EditCustomerForm
          key={customer.id}
          customer={{
            id: customer.id,
            businessId: customer.businessId,
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            address: customer.address,
            notes: customer.notes,
          }}
        />
      </section>
      <CustomerStatusControl
        businessId={customer.businessId}
        customerId={customer.id}
        customerName={customer.name}
        status={customer.status}
        />
      {"orders" in history ? <Panel title="Purchase history"><p className="text-muted text-sm">Saved order prices in {business.currency}. Pending and cancelled orders are labelled separately.</p><DataTable headings={["Order", "Created", "Status", "Items", "Total"]} rows={history.orders.map((order) => [order.id.slice(-8), utc(order.createdAt), order.status, order.items.map((item) => `${item.name} × ${item.quantity} (${money(item.unitPrice, business.currency)})`).join(", "), money(order.totalAmount, business.currency)])} empty="No orders have been placed for this customer." /><Pager pagination={history.pagination} query={query} /></Panel> : history}
    </div>
  );
}
