import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePageUser } from "@/lib/auth/require-page-user";
import { AppError } from "@/lib/errors";
import { listCustomersQuerySchema } from "@/lib/validation/customer";
import { requireBusinessAccess } from "@/services/business/business-access.service";
import { listCustomers } from "@/services/customer/list-customers.service";

export const metadata: Metadata = {
  title: "Customers",
};

type CustomersPageProps = {
  params: Promise<{ businessId: string }>;
  searchParams: Promise<
    Record<string, string | string[] | undefined>
  >;
};

export default async function CustomersPage({
  params,
  searchParams,
}: CustomersPageProps) {
  const user = await requirePageUser();
  const { businessId } = await params;
  const basePath = `/businesses/${businessId}/customers`;

  const access = await requireBusinessAccess(
    user.id,
    businessId,
    "canManageCustomers",
  ).catch((error: unknown) => {
    if (error instanceof AppError) {
      if (
        error.code === "BUSINESS_NOT_FOUND" ||
        error.code === "INVALID_BUSINESS_ID"
      ) {
        notFound();
      }

      if (error.statusCode === 403) return null;
    }

    throw error;
  });

  if (!access) {
    return (
      <section className="glass-panel space-y-4 p-6">
        <h1 className="text-2xl font-semibold">
          Customer access required
        </h1>
        <p className="text-muted">
          Ask your business owner for customer management permission.
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

  const rawQuery = await searchParams;
  const parsed = listCustomersQuerySchema.safeParse({
    search: rawQuery.search,
    status: rawQuery.status,
    page: rawQuery.page,
    limit: rawQuery.limit,
  });

  if (!parsed.success) {
    return (
      <section className="glass-panel space-y-4 p-6">
        <h1 className="text-2xl font-semibold">
          Invalid customer filters
        </h1>
        <p className="text-muted">
          Check your search, status, and page values.
        </p>
        <Link href={basePath} className="secondary-button">
          Reset filters
        </Link>
      </section>
    );
  }

  const query = parsed.data;
  const { customers, pagination } = await listCustomers(
    user.id,
    businessId,
    query,
  );

  function pageHref(page: number) {
    const filters = new URLSearchParams({
      search: query.search,
      status: query.status,
      limit: String(query.limit),
      page: String(page),
    });

    return `${basePath}?${filters.toString()}`;
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">
            Customers
          </h1>
          <p className="text-muted">
            Manage your business’s customer records.
          </p>
        </div>

        <Link href={`${basePath}/new`} className="primary-button">
          Add customer
        </Link>
      </header>

      <form
        key={`${query.search}:${query.status}:${query.limit}`}
        action={basePath}
        method="get"
        className="glass-panel grid gap-4 p-5 sm:grid-cols-[minmax(0,1fr)_160px_auto] sm:items-end"
      >
        <div className="space-y-2">
          <label htmlFor="customer-search" className="block text-sm font-medium">
            Search customers
          </label>
          <input
            id="customer-search"
            name="search"
            type="search"
            defaultValue={query.search}
            maxLength={100}
            placeholder="Name, email, or phone"
            className="glass-input"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="customer-status" className="block text-sm font-medium">
            Status
          </label>
          <select
            id="customer-status"
            name="status"
            defaultValue={query.status}
            className="glass-input"
          >
            <option value="Active">Active</option>
            <option value="Archived">Archived</option>
            <option value="All">All</option>
          </select>
        </div>

        <input type="hidden" name="limit" value={query.limit} />

        <button type="submit" className="primary-button">
          Apply filters
        </button>
      </form>

      <section aria-label="Customer results" className="space-y-4">
        <p className="text-muted text-sm">
          {pagination.total} matching customers
        </p>

        {customers.length === 0 ? (
          <div className="glass-panel space-y-4 p-8 text-center">
            <h2 className="text-xl font-semibold">
              No customers found
            </h2>
            <p className="text-muted">
              Try another filter or add a customer to get started.
            </p>
            <Link href={basePath} className="secondary-button">
              Reset filters
            </Link>
          </div>
        ) : (
          <ul className="grid gap-4 xl:grid-cols-2">
            {customers.map((customer) => (
              <li key={customer.id} className="glass-panel min-w-0 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <h2 className="min-w-0 break-words text-lg font-semibold">
                    <Link
                      href={`${basePath}/${customer.id}`}
                      className="rounded underline-offset-4 hover:underline"
                    >
                      {customer.name}
                    </Link>
                  </h2>

                  {"status" in customer && (
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs">
                      {customer.status}
                    </span>
                  )}
                </div>

                <dl className="mt-4 space-y-3 text-sm">
                  <div>
                    <dt className="text-muted">Email</dt>
                    <dd className="mt-1 break-all">
                      {customer.email || "Not provided"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted">Phone</dt>
                    <dd className="mt-1 break-words">
                      {customer.phone || "Not provided"}
                    </dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        )}

        <nav
          aria-label="Customer pagination"
          className="flex flex-wrap items-center justify-between gap-4"
        >
          <p className="text-muted text-sm">
            {pagination.totalPages === 0
              ? "No pages"
              : `Page ${pagination.page} of ${pagination.totalPages}`}
          </p>

          <div className="flex flex-wrap gap-3">
            {pagination.page > 1 && (
              <Link
                href={pageHref(pagination.page - 1)}
                className="secondary-button"
              >
                Previous
              </Link>
            )}

            {pagination.page < pagination.totalPages && (
              <Link
                href={pageHref(pagination.page + 1)}
                className="secondary-button"
              >
                Next
              </Link>
            )}
          </div>
        </nav>
      </section>
    </div>
  );
}