import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CreateCustomerForm } from "@/components/customer/create-customer-form";
import { requirePageUser } from "@/lib/auth/require-page-user";
import { AppError } from "@/lib/errors";
import { requireBusinessAccess } from "@/services/business/business-access.service";

export const metadata: Metadata = {
  title: "Add customer",
};

type CreateCustomerPageProps = {
  params: Promise<{
    businessId: string;
  }>;
};

export default async function CreateCustomerPage({
  params,
}: CreateCustomerPageProps) {
  const user = await requirePageUser();
  const { businessId } = await params;
  const customersPath = `/businesses/${businessId}/customers`;

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

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <Link
        href={customersPath}
        className="inline-block rounded text-sm font-medium text-indigo-300 underline-offset-4 hover:underline"
      >
        ← Back to customers
      </Link>

      <section
        aria-labelledby="create-customer-heading"
        className="glass-panel p-6 sm:p-10"
      >
        <header className="mb-8 space-y-3">
          <h1
            id="create-customer-heading"
            className="text-2xl font-semibold tracking-tight sm:text-3xl"
          >
            Add customer
          </h1>

          <p className="text-muted leading-7">
            Add a customer to {access.business.name}.
            Only the customer name is required.
          </p>
        </header>

        <CreateCustomerForm
          businessId={access.business._id.toString()}
        />
      </section>
    </div>
  );
}