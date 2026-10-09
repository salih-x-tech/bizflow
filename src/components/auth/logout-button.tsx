"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function handleLogout() {
    if (pending) return;

    setPending(true);
    setError("");

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
      });

      if (!response.ok && response.status !== 401) {
        setError("Unable to log out. Please try again.");
        return;
      }

      router.replace("/login");
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
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={handleLogout}
        disabled={pending}
        aria-busy={pending}
        className="secondary-button"
      >
        {pending ? "Logging out…" : "Log out"}
      </button>

      <div role="alert" aria-atomic="true">
        {error && (
          <p className="form-error max-w-xs">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}