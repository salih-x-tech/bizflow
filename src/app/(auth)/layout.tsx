import Link from "next/link";
import type { ReactNode } from "react";

export default function AuthLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <main className="flex min-h-screen flex-1 items-center justify-center px-4 py-10 sm:px-6">
      <div className="grid w-full max-w-5xl gap-8 lg:grid-cols-2 lg:items-center lg:gap-16">
        <section className="space-y-6">
          <Link
            href="/"
            className="inline-flex items-center gap-3 rounded-lg"
            aria-label="BizFlow home"
          >
            <span
              aria-hidden="true"
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-indigo-300/30 bg-indigo-500/20 text-xl font-bold text-indigo-200"
            >
              B
            </span>

            <span className="text-2xl font-semibold tracking-tight">
              BizFlow
            </span>
          </Link>

          <div className="max-w-md space-y-4">
            <p className="text-sm font-medium tracking-wide text-indigo-300">
              Your business, in one place
            </p>

            <h2 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
              Bring clarity to your everyday business.
            </h2>

            <p className="text-muted leading-7">
              Keep customers, products, stock, orders, and
              invoices connected so your team can focus on
              what comes next.
            </p>
          </div>

          <ul className="text-muted hidden space-y-3 text-sm lg:block">
            <li>Organize your customers and product catalog.</li>
            <li>Follow stock movements and order progress.</li>
            <li>Give your team the access they need.</li>
          </ul>
        </section>

        <section
          aria-label="Account access"
          className="glass-panel min-w-0 p-6 sm:p-10"
        >
          {children}
        </section>
      </div>
    </main>
  );
}