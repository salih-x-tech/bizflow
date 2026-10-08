"use client";

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

  return "Unable to create your business. Please try again.";
}

export function CreateBusinessForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (pending) return;

    const formData = new FormData(event.currentTarget);

    setError("");
    setPending(true);

    try {
      const response = await fetch("/api/businesses", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: String(formData.get("name") ?? "").trim(),
          currency: String(
            formData.get("currency") ?? "",
          ).trim().toUpperCase(),
          businessType: String(
            formData.get("businessType") ?? "",
          ).trim(),
          contactEmail: String(
            formData.get("contactEmail") ?? "",
          ).trim(),
          contactPhone: String(
            formData.get("contactPhone") ?? "",
          ).trim(),
          address: String(
            formData.get("address") ?? "",
          ).trim(),
        }),
      });

      const result: unknown = await response.json();

      if (
        !response.ok ||
        typeof result !== "object" ||
        result === null ||
        !("success" in result) ||
        result.success !== true
      ) {
        if (response.status === 401) {
          setError(
            "Your session has expired. Log in again before creating your business.",
          );
        } else {
          setError(getErrorMessage(result));
        }

        return;
      }

      router.replace("/");
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
        <legend className="mb-4 text-base font-semibold">
          Business details
        </legend>

        <div className="space-y-2">
          <label
            htmlFor="business-name"
            className="block text-sm font-medium"
          >
            Business name
          </label>

          <input
            id="business-name"
            name="name"
            type="text"
            autoComplete="organization"
            minLength={2}
            maxLength={100}
            required
            placeholder="Your business name"
            className="glass-input"
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <label
              htmlFor="business-currency"
              className="block text-sm font-medium"
            >
              Currency
            </label>

            <input
              id="business-currency"
              name="currency"
              type="text"
              defaultValue="PKR"
              minLength={3}
              maxLength={3}
              pattern="[A-Za-z]{3}"
              required
              aria-describedby="currency-hint"
              className="glass-input uppercase"
            />

            <p
              id="currency-hint"
              className="text-muted text-xs leading-5"
            >
              Three-letter code, such as PKR or USD.
              Currency cannot be changed after creation.
            </p>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="business-type"
              className="block text-sm font-medium"
            >
              Business type
            </label>

            <input
              id="business-type"
              name="businessType"
              type="text"
              minLength={2}
              maxLength={100}
              required
              placeholder="For example, Retail"
              className="glass-input"
            />
          </div>
        </div>
      </fieldset>

      <fieldset disabled={pending} className="space-y-5">
        <legend className="mb-4 text-base font-semibold">
          Contact details
          <span className="text-muted ml-2 text-sm font-normal">
            Optional
          </span>
        </legend>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <label
              htmlFor="business-email"
              className="block text-sm font-medium"
            >
              Contact email
            </label>

            <input
              id="business-email"
              name="contactEmail"
              type="email"
              autoComplete="email"
              maxLength={254}
              className="glass-input"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="business-phone"
              className="block text-sm font-medium"
            >
              Contact phone
            </label>

            <input
              id="business-phone"
              name="contactPhone"
              type="tel"
              autoComplete="tel"
              maxLength={30}
              className="glass-input"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="business-address"
            className="block text-sm font-medium"
          >
            Address
          </label>

          <textarea
            id="business-address"
            name="address"
            autoComplete="street-address"
            maxLength={500}
            rows={3}
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

      <button
        type="submit"
        disabled={pending}
        className="primary-button w-full sm:w-auto"
      >
        {pending ? "Creating business…" : "Create business"}
      </button>
    </form>
  );
}