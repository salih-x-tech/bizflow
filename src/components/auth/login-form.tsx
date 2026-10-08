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

  return "Unable to log in. Please try again.";
}

export function LoginForm() {
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
      const response = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: String(formData.get("email") ?? "").trim(),
          password: String(formData.get("password") ?? ""),
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
      className="space-y-5"
    >
      <div className="space-y-2">
        <label
          htmlFor="login-email"
          className="block text-sm font-medium"
        >
          Email address
        </label>

        <input
          id="login-email"
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
          htmlFor="login-password"
          className="block text-sm font-medium"
        >
          Password
        </label>

        <input
          id="login-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          disabled={pending}
          className="glass-input"
        />
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
        {pending ? "Logging in…" : "Log in"}
      </button>
    </form>
  );
}