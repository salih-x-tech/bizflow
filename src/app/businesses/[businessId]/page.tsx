import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePageUser } from "@/lib/auth/require-page-user";
import { AppError } from "@/lib/errors";
import { requireBusinessAccess } from "@/services/business/business-access.service";

export const metadata: Metadata = {
  title: "Business overview",
};

type WorkspacePageProps = {
  params: Promise<{
    businessId: string;
  }>;
};

export default async function WorkspacePage({
  params,
}: WorkspacePageProps) {
  const user = await requirePageUser();
  const { businessId } = await params;

  const { business, membership } = await requireBusinessAccess(
    user.id,
    businessId,
  ).catch((error: unknown) => {
    if (
      error instanceof AppError &&
      (error.code === "BUSINESS_NOT_FOUND" ||
        error.code === "INVALID_BUSINESS_ID")
    ) {
      notFound();
    }

    throw error;
  });

  return (
    <section
      aria-labelledby="overview-heading"
      className="glass-panel p-6 sm:p-10"
    >
      <header className="space-y-3">
        <p className="text-sm font-medium text-indigo-300">
          Business workspace
        </p>

        <h1
          id="overview-heading"
          className="break-words text-3xl font-semibold tracking-tight"
        >
          {business.name}
        </h1>

        <p className="text-muted leading-7">
          Welcome, {user.name}. Use the business menu to
          access your available tools.
        </p>
      </header>

      <dl className="mt-8 grid gap-5 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <dt className="text-muted text-sm">Business type</dt>
          <dd className="mt-2 break-words font-semibold">
            {business.businessType}
          </dd>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <dt className="text-muted text-sm">Currency</dt>
          <dd className="mt-2 font-semibold">
            {business.currency}
          </dd>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <dt className="text-muted text-sm">Your role</dt>
          <dd className="mt-2 font-semibold">
            {membership.role}
          </dd>
        </div>
      </dl>
    </section>
  );
}