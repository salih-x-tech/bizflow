"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

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

  return "Unable to create your account. Please try again.";
}

export function RegisterForm() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmError, setConfirmError] = useState("");
  const [created, setCreated] = useState(false);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (pending) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(
      formData.get("confirmPassword") ?? "",
    );

    setError("");
    setPasswordError("");
    setConfirmError("");

    let invalid = false;

    if (
      password.length < 12 ||
      new TextEncoder().encode(password).length > 72
    ) {
      setPasswordError(
        "Use at least 12 characters and no more than 72 UTF-8 bytes.",
      );
      invalid = true;
    }

    if (password !== confirmPassword) {
      setConfirmError("Passwords do not match.");
      invalid = true;
    }

    if (invalid) return;

    setPending(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: String(formData.get("name") ?? "").trim(),
          email: String(formData.get("email") ?? "").trim(),
          password,
          confirmPassword,
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
        setError(getErrorMessage(result));
        return;
      }

      form.reset();
      setCreated(true);
    } catch {
      setError(
        "Unable to connect. Check your connection and try again.",
      );
    } finally {
      setPending(false);
    }
  }

  if (created) {
    return (
      <div className="space-y-5">
        <p role="status" className="text-sm leading-6 text-emerald-200">
          Your account has been created. Log in to get started.
        </p>

        <Link href="/login" className="primary-button w-full">
          Continue to login
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      aria-busy={pending}
      className="space-y-5"
    >
      <div className="space-y-2">
        <label
          htmlFor="register-name"
          className="block text-sm font-medium"
        >
          Full name
        </label>

        <input
          id="register-name"
          name="name"
          type="text"
          autoComplete="name"
          minLength={2}
          maxLength={100}
          required
          disabled={pending}
          className="glass-input"
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="register-email"
          className="block text-sm font-medium"
        >
          Email address
        </label>

        <input
          id="register-email"
          name="email"
          type="email"
          autoComplete="username"
          maxLength={254}
          required
          disabled={pending}
          placeholder="you@example.com"
          className="glass-input"
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="register-password"
          className="block text-sm font-medium"
        >
          Password
        </label>

        <input
          id="register-password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={12}
          maxLength={72}
          required
          disabled={pending}
          aria-invalid={Boolean(passwordError)}
          aria-describedby="password-hint password-error"
          className="glass-input"
        />

        <p id="password-hint" className="text-muted text-xs leading-5">
          Use at least 12 characters. Some characters count
          toward the 72-byte limit more than once.
        </p>

        <p id="password-error" role="alert" className="form-error">
          {passwordError}
        </p>
      </div>

      <div className="space-y-2">
        <label
          htmlFor="register-confirm-password"
          className="block text-sm font-medium"
        >
          Confirm password
        </label>

        <input
          id="register-confirm-password"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          maxLength={72}
          required
          disabled={pending}
          aria-invalid={Boolean(confirmError)}
          aria-describedby="confirm-password-error"
          className="glass-input"
        />

        <p
          id="confirm-password-error"
          role="alert"
          className="form-error"
        >
          {confirmError}
        </p>
      </div>

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
        className="primary-button w-full"
      >
        {pending ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}