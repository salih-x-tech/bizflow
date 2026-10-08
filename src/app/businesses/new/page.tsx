import type { Metadata } from "next";
import Link from "next/link";
import { CreateBusinessForm } from "@/components/business/create-business-form";
import { requirePageUser } from "@/lib/auth/require-page-user";

export const metadata: Metadata = {
  title: "Create business",
};

export default async function CreateBusinessPage() {
  await requirePageUser();

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
      <Link
        href="/"
        className="inline-block rounded text-sm font-medium text-indigo-300 underline-offset-4 hover:underline"
      >
        ← Back to your businesses
      </Link>

      <section
        aria-labelledby="create-business-heading"
        className="glass-panel mt-6 p-6 sm:p-10"
      >
        <header className="mb-8 space-y-3">
          <h1
            id="create-business-heading"
            className="text-2xl font-semibold tracking-tight sm:text-3xl"
          >
            Create your business
          </h1>

          <p className="text-muted leading-7">
            Set up your workspace. You will become its owner
            and can invite your team afterward.
          </p>
        </header>

        <CreateBusinessForm />
      </section>
    </main>
  );
}