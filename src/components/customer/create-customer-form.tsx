"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

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

  return "Unable to create the customer. Please try again.";
}

export function CreateCustomerForm({
  businessId,
}: {
  businessId: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [emailError, setEmailError] = useState("");
  const customersPath = `/businesses/${businessId}/customers`;

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (pending) return;

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();

    setError("");
    setEmailError("");

    if (!name) {
      setError("Customer name is required.");
      return;
    }

    setPending(true);

    try {
      const response = await fetch(
        `/api/businesses/${businessId}/customers`,
        {
          method: "POST",
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
            ? "Your session has expired. Log in again before adding a customer."
            : getErrorMessage(result),
        );
        return;
      }

      router.replace(customersPath);
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
        <legend className="sr-only">Customer details</legend>

        <div className="space-y-2">
          <label
            htmlFor="customer-name"
            className="block text-sm font-medium"
          >
            Customer name
          </label>

          <input
            id="customer-name"
            name="name"
            type="text"
            autoComplete="name"
            maxLength={100}
            required
            className="glass-input"
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <label
              htmlFor="customer-email"
              className="block text-sm font-medium"
            >
              Email address (optional)
            </label>

            <input
              id="customer-email"
              name="email"
              type="email"
              autoComplete="email"
              maxLength={254}
              aria-invalid={Boolean(emailError)}
              aria-describedby="customer-email-error"
              className="glass-input"
            />
            <p id="customer-email-error" className="form-error">{emailError}</p>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="customer-phone"
              className="block text-sm font-medium"
            >
              Phone (optional)
            </label>

            <input
              id="customer-phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              maxLength={30}
              className="glass-input"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="customer-address"
            className="block text-sm font-medium"
          >
            Address (optional)
          </label>

          <textarea
            id="customer-address"
            name="address"
            autoComplete="street-address"
            maxLength={500}
            rows={3}
            className="glass-input resize-y"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="customer-notes"
            className="block text-sm font-medium"
          >
            Notes (optional)
          </label>

          <textarea
            id="customer-notes"
            name="notes"
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

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={pending}
          className="primary-button"
        >
          {pending ? "Saving customer…" : "Save customer"}
        </button>

        {!pending && (
          <Link href={customersPath} className="secondary-button">
            Cancel
          </Link>
        )}
      </div>
    </form>
  );
}
