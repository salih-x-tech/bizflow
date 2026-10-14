"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type EditableCustomer = {
  id: string;
  businessId: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
};

function getErrorMessage(result: unknown): string {
  if (
    typeof result === "object" &&
    result !== null &&
    "error" in result &&
    typeof result.error === "object" &&
    result.error !== null &&
    "message" in result.error &&
    typeof result.error.message === "string"
  ) {
    return result.error.message;
  }

  return "Unable to update the customer. Please try again.";
}

export function EditCustomerForm({
  customer,
}: {
  customer: EditableCustomer;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (pending) return;

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();

    setError("");
    setEmailError("");
    setSuccess("");

    if (!name) {
      setError("Customer name is required.");
      return;
    }

    setPending(true);

    try {
      const response = await fetch(
        `/api/businesses/${customer.businessId}/customers/${customer.id}`,
        {
          method: "PATCH",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name,
            email: String(formData.get("email") ?? "").trim(),
            phone: String(formData.get("phone") ?? "").trim(),
            address: String(formData.get("address") ?? "").trim(),
            notes: String(formData.get("notes") ?? "").trim(),
          }),
        },
      );

      const result: unknown = await response.json();

      if (
        !response.ok ||
        typeof result !== "object" ||
        result === null ||
        !("success" in result) ||
        result.success !== true
      ) {
        if (getErrorMessage(result).includes("email already exists")) {
          setEmailError("Email must be unique within this business, including archived customers.");
        }
        setError(
          response.status === 401
            ? "Your session has expired. Log in again before saving."
            : getErrorMessage(result),
        );
        return;
      }

      setSuccess("Customer details saved.");
      router.refresh();
    } catch {
      setError(
        "Unable to connect. Check your connection and try again.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      aria-busy={pending}
      className="space-y-6"
    >
      <fieldset disabled={pending} className="space-y-5">
        <legend className="sr-only">Edit customer details</legend>

        <div className="space-y-2">
          <label
            htmlFor="edit-customer-name"
            className="block text-sm font-medium"
          >
            Customer name
          </label>

          <input
            id="edit-customer-name"
            name="name"
            type="text"
            autoComplete="name"
            defaultValue={customer.name}
            maxLength={100}
            required
            className="glass-input"
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <label
              htmlFor="edit-customer-email"
              className="block text-sm font-medium"
            >
              Email address (optional)
            </label>

            <input
              id="edit-customer-email"
              name="email"
              type="email"
              autoComplete="email"
              defaultValue={customer.email ?? ""}
              maxLength={254}
              aria-invalid={Boolean(emailError)}
              aria-describedby="edit-customer-email-error"
              className="glass-input"
            />
            <p id="edit-customer-email-error" className="form-error">{emailError}</p>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="edit-customer-phone"
              className="block text-sm font-medium"
            >
              Phone (optional)
            </label>

            <input
              id="edit-customer-phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              defaultValue={customer.phone ?? ""}
              maxLength={30}
              className="glass-input"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="edit-customer-address"
            className="block text-sm font-medium"
          >
            Address (optional)
          </label>

          <textarea
            id="edit-customer-address"
            name="address"
            autoComplete="street-address"
            defaultValue={customer.address ?? ""}
            maxLength={500}
            rows={3}
            className="glass-input resize-y"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="edit-customer-notes"
            className="block text-sm font-medium"
          >
            Notes (optional)
          </label>

          <textarea
            id="edit-customer-notes"
            name="notes"
            defaultValue={customer.notes ?? ""}
            maxLength={2000}
            rows={4}
            className="glass-input resize-y"
          />
        </div>
      </fieldset>

      <div role="alert" aria-atomic="true">
        {error && (
          <p className="form-error rounded-xl border border-rose-300/20 bg-rose-500/10 px-4 py-3">
            {error}
          </p>
        )}
      </div>

      <p
        role="status"
        aria-atomic="true"
        className="text-sm text-emerald-200"
      >
        {success}
      </p>

      <button
        type="submit"
        disabled={pending}
        className="primary-button"
      >
        {pending ? "Saving changes…" : "Save changes"}
      </button>
    </form>
  );
}
