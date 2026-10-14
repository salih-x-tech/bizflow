"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type CustomerStatusControlProps = {
  businessId: string;
  customerId: string;
  customerName: string;
  status: "Active" | "Archived";
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

  return "Unable to change customer status. Please try again.";
}

export function CustomerStatusControl({
  businessId,
  customerId,
  customerName,
  status,
}: CustomerStatusControlProps) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function openConfirmation() {
    setError("");
    setSuccess("");
    dialogRef.current?.showModal();
    setDialogOpen(true);
  }

  async function changeStatus() {
    if (pending) return;

    const archiving = status === "Active";

    setPending(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `/api/businesses/${businessId}/customers/${customerId}`,
        {
          method: archiving ? "DELETE" : "PATCH",
          credentials: "same-origin",
          ...(archiving
            ? {}
            : {
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ status: "Active" }),
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
        setError(
          response.status === 401
            ? "Your session has expired. Log in again to continue."
            : getErrorMessage(result),
        );
        return;
      }

      dialogRef.current?.close();
      setDialogOpen(false);
      setSuccess(
        archiving ? "Customer archived." : "Customer restored.",
      );
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
    <section
      aria-labelledby="customer-status-heading"
      className="glass-panel space-y-4 p-6 sm:p-10"
    >
      <div className="space-y-2">
        <h2
          id="customer-status-heading"
          className="text-lg font-semibold"
        >
          Customer status
        </h2>

        <p className="text-muted text-sm leading-6">
          {status === "Active"
            ? "Archiving keeps this customer’s history and prevents selection for new orders."
            : "Restore this customer to make them available for new orders."}
        </p>
      </div>

      <button
        type="button"
        disabled={pending}
        onClick={
          status === "Active"
            ? openConfirmation
            : () => void changeStatus()
        }
        className="secondary-button"
      >
        {pending
          ? "Updating status…"
          : status === "Active"
            ? "Archive customer"
            : "Restore customer"}
      </button>

      <div role="alert" aria-atomic="true">
        {!dialogOpen && error && (
          <p className="form-error">{error}</p>
        )}
      </div>

      <p role="status" className="text-sm text-emerald-200">
        {success}
      </p>

      <dialog
        ref={dialogRef}
        aria-labelledby="archive-dialog-heading"
        aria-describedby="archive-dialog-description"
        onCancel={(event) => {
          if (pending) event.preventDefault();
        }}
        onClose={() => setDialogOpen(false)}
        className="glass-panel fixed m-auto max-h-[90vh] w-[calc(100%_-_2rem)] max-w-md overflow-y-auto p-6 text-foreground backdrop:bg-black/70"
      >
        <h2
          id="archive-dialog-heading"
          className="text-xl font-semibold"
        >
          Archive customer?
        </h2>

        <p
          id="archive-dialog-description"
          className="text-muted mt-3 break-words text-sm leading-6"
        >
          Archive {customerName}? Their records and existing
          order history will remain available. You can restore
          them later.
        </p>

        <div role="alert" aria-atomic="true" className="mt-4">
          {error && <p className="form-error">{error}</p>}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            autoFocus
            disabled={pending}
            onClick={() => dialogRef.current?.close()}
            className="secondary-button"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={pending}
            aria-busy={pending}
            onClick={() => void changeStatus()}
            className="primary-button"
          >
            {pending ? "Archiving…" : "Confirm archive"}
          </button>
        </div>
      </dialog>
    </section>
  );
}