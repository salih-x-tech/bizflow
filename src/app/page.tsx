import type { Metadata } from "next";
import Link from "next/link";
import { requirePageUser } from "@/lib/auth/require-page-user";
import { listBusinesses } from "@/services/business/list-businesses.service";

export const metadata: Metadata = {
  title: "Your businesses",
};

export default async function HomePage() {
  const user = await requirePageUser();
  const businesses = await listBusinesses(user.id);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-10 flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/"
          className="rounded-lg text-2xl font-semibold tracking-tight"
        >
          BizFlow
        </Link>

        <p className="text-muted max-w-full break-words text-sm">
          Signed in as {user.name}
        </p>
      </header>

      <section aria-labelledby="businesses-heading">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-5">
          <div className="space-y-2">
            <h1
              id="businesses-heading"
              className="text-3xl font-semibold tracking-tight sm:text-4xl"
            >
              Your businesses
            </h1>

            <p className="text-muted leading-7">
              Choose a business to continue your work.
            </p>
          </div>

          <Link
            href="/businesses/new"
            className="primary-button"
          >
            Create business
          </Link>
        </div>

        {businesses.length === 0 ? (
          <div className="glass-panel px-6 py-12 text-center sm:px-10">
            <h2 className="text-xl font-semibold">
              Your workspace starts here
            </h2>

            <p className="text-muted mx-auto mt-3 max-w-md leading-7">
              Create your first business to manage customers,
              products, stock, and orders. If you are joining
              a team, accept the invitation sent by its owner.
            </p>

            <Link
              href="/businesses/new"
              className="primary-button mt-6"
            >
              Create your first business
            </Link>
          </div>
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {businesses.map((business) => (
              <li key={business.id} className="min-w-0">
                <Link
                  href={`/businesses/${business.id}`}
                  className="glass-panel block h-full p-6 transition-colors hover:border-indigo-300/50"
                >
                  <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                    <span
                      aria-hidden="true"
                      className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/20 text-xl font-semibold text-indigo-200"
                    >
                      {business.name.slice(0, 1).toUpperCase()}
                    </span>

                    <span className="rounded-full border border-indigo-300/20 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-200">
                      {business.role}
                    </span>
                  </div>

                  <h2 className="break-words text-lg font-semibold">
                    {business.name}
                  </h2>

                  <p className="text-muted mt-2 break-words text-sm">
                    {business.businessType} · {business.currency}
                  </p>

                  <p className="mt-6 text-sm font-medium text-indigo-300">
                    Open workspace →
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}