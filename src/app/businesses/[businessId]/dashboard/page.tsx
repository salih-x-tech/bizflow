import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePageUser } from "@/lib/auth/require-page-user";
import { AppError } from "@/lib/errors";
import { getDashboard } from "@/services/dashboard/get-dashboard.service";

export const metadata: Metadata = {
  title: "Dashboard",
};

type DashboardPageProps = {
  params: Promise<{
    businessId: string;
  }>;
};

function formatAmount(amount: number, currency: string) {
  return `${new Intl.NumberFormat("en-PK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)} ${currency}`;
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(value));
}

export default async function DashboardPage({
  params,
}: DashboardPageProps) {
  const user = await requirePageUser();
  const { businessId } = await params;

  const dashboard = await getDashboard(
    user.id,
    businessId,
    {},
  ).catch((error: unknown) => {
    if (error instanceof AppError) {
      if (
        error.code === "BUSINESS_NOT_FOUND" ||
        error.code === "INVALID_BUSINESS_ID"
      ) {
        notFound();
      }

      if (error.statusCode === 403) {
        return null;
      }
    }

    throw error;
  });

  if (!dashboard) {
    return (
      <section className="glass-panel space-y-4 p-6 sm:p-10">
        <h1 className="text-2xl font-semibold">
          Dashboard access required
        </h1>

        <p className="text-muted leading-7">
          Ask your business owner for dashboard permission.
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

  const hasWidgets = Object.values(
    dashboard.widgetAccess,
  ).some(Boolean);

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          Dashboard
        </h1>

        <p className="text-muted break-words leading-7">
          A current view of {dashboard.business.name}.
        </p>
      </header>

      {!hasWidgets && (
        <section className="glass-panel space-y-3 p-6">
          <h2 className="text-lg font-semibold">
            Your dashboard is ready
          </h2>

          <p className="text-muted leading-7">
            Ask your business owner to grant access to orders,
            inventory, or reports to see the related widgets.
          </p>
        </section>
      )}

      {dashboard.revenue && (
        <section
          aria-labelledby="revenue-heading"
          className="glass-panel p-6"
        >
          <h2
            id="revenue-heading"
            className="text-muted text-sm font-medium"
          >
            Revenue from currently completed orders
          </h2>

          <p className="mt-3 break-words text-3xl font-semibold text-indigo-200">
            {formatAmount(
              dashboard.revenue.totalRevenue,
              dashboard.revenue.currency,
            )}
          </p>

          <p className="text-muted mt-3 text-sm">
            {dashboard.revenue.completedOrders} completed orders
            · All time
          </p>
        </section>
      )}

      {dashboard.recentOrders && (
        <section
          aria-labelledby="recent-orders-heading"
          className="glass-panel p-6"
        >
          <h2
            id="recent-orders-heading"
            className="text-lg font-semibold"
          >
            Recent orders
          </h2>

          {dashboard.recentOrders.orders.length === 0 ? (
            <p className="text-muted mt-4 leading-7">
              No orders yet. Orders created for this business
              will appear here.
            </p>
          ) : (
            <ul className="mt-5 divide-y divide-white/10">
              {dashboard.recentOrders.orders.map((order) => (
                <li
                  key={order.id}
                  className="flex flex-wrap items-center justify-between gap-4 py-4"
                >
                  <div className="min-w-0 space-y-1">
                    <p className="break-all text-sm font-medium">
                      Order {order.id.slice(-8).toUpperCase()}
                    </p>

                    <p className="text-muted text-xs">
                      {formatDate(order.createdAt)} · UTC
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-semibold">
                      {formatAmount(
                        order.totalAmount,
                        dashboard.business.currency,
                      )}
                    </p>

                    <span
                      className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${
                        order.status === "Completed"
                          ? "bg-emerald-500/15 text-emerald-200"
                          : order.status === "Cancelled"
                            ? "bg-rose-500/15 text-rose-200"
                            : "bg-amber-500/15 text-amber-200"
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {dashboard.lowStock && (
        <section
          aria-labelledby="low-stock-heading"
          className="glass-panel p-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2
              id="low-stock-heading"
              className="text-lg font-semibold"
            >
              Low-stock alerts
            </h2>

            <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-medium text-amber-200">
              {dashboard.lowStock.total} products
            </span>
          </div>

          {dashboard.lowStock.products.length === 0 ? (
            <p className="text-muted mt-4 leading-7">
              No active products are at or below their
              configured low-stock threshold.
            </p>
          ) : (
            <>
              <ul className="mt-5 divide-y divide-white/10">
                {dashboard.lowStock.products.map((product) => (
                  <li
                    key={product.productId}
                    className="flex flex-wrap items-center justify-between gap-3 py-4"
                  >
                    <p className="min-w-0 break-words text-sm font-medium">
                      {product.name}
                    </p>

                    <p className="text-sm font-semibold text-amber-200">
                      {product.quantity} remaining
                    </p>
                  </li>
                ))}
              </ul>

              <p className="text-muted mt-4 text-xs">
                Showing {dashboard.lowStock.products.length} of{" "}
                {dashboard.lowStock.total} low-stock products.
              </p>
            </>
          )}
        </section>
      )}
    </div>
  );
}