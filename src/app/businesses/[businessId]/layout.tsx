import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { WorkspaceNav } from "@/components/workspace/workspace-nav";
import { requirePageUser } from "@/lib/auth/require-page-user";
import { AppError } from "@/lib/errors";
import { requireBusinessAccess } from "@/services/business/business-access.service";
import { LogoutButton } from "@/components/auth/logout-button";


type WorkspaceLayoutProps = {
  children: ReactNode;
  params: Promise<{
    businessId: string;
  }>;
};

export default async function WorkspaceLayout({
  children,
  params,
}: WorkspaceLayoutProps) {
  const user = await requirePageUser();
  const { businessId } = await params;

  const access = await requireBusinessAccess(
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

  const { business, membership } = access;

  return (
    <div className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-6 sm:px-6">
      <a
        href="#workspace-content"
        className="sr-only rounded-lg bg-indigo-600 px-4 py-3 text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50"
      >
        Skip to content
      </a>

      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/"
          className="rounded-lg text-2xl font-semibold tracking-tight"
        >
          BizFlow
        </Link>

        <div className="flex flex-wrap items-center gap-4">
          <p className="text-muted max-w-full break-words text-sm">
            {user.name}
          </p>

          <Link href="/" className="secondary-button">
            Switch business
          </Link>
          <LogoutButton />
        </div>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="glass-panel min-w-0 p-4 lg:sticky lg:top-6">
          <div className="mb-5 border-b border-white/10 px-3 pb-5">
            <p className="break-words font-semibold">
              {business.name}
            </p>

            <p className="text-muted mt-2 text-xs">
              {membership.role} · {business.currency}
            </p>
          </div>

          <WorkspaceNav
            businessId={business._id.toString()}
            role={membership.role}
            permissions={membership.permissions}
          />
        </aside>

        <main
          id="workspace-content"
          tabIndex={-1}
          className="min-w-0"
        >
          {children}
        </main>
      </div>
    </div>
  );
}