"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export type Field = {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  min?: number;
  max?: number;
  step?: string;
  maxLength?: number;
  value?: string | number;
  hint?: string;
  options?: { value: string; label: string }[];
  multiple?: boolean;
};

export class MutationError extends Error {
  constructor(message: string, readonly fields: Record<string, string> = {}) {
    super(message);
  }
}

export async function requestMutation(url: string, method: string, body?: unknown) {
  const response = await fetch(url, {
    method,
    credentials: "same-origin",
    ...(body instanceof FormData
      ? { body }
      : body === undefined
        ? {}
        : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
  });
  const result = await response.json();
  if (!response.ok || result.success !== true) {
    if (response.status === 401) {
      throw new MutationError("Your session has expired. Log in again to continue.");
    }
    const issues: { field: string; issue: string }[] = Array.isArray(result.error?.details)
      ? result.error.details
      : [];
    const details = issues.map((item) => `${item.field}: ${item.issue}`).join(" ");
    const fields = Object.fromEntries(issues.map((item) => [item.field, item.issue]));
    throw new MutationError(
      `${result.error?.message || "Unable to complete this request."} ${details}`.trim(),
      fields,
    );
  }
  return result.data;
}

export function MutationForm({
  url, method = "POST", fields, label = "Save", redirectTo, multipart = false,
}: {
  url: string;
  method?: string;
  fields: Field[];
  label?: string;
  redirectTo?: string;
  multipart?: boolean;
}) {
  const id = useId();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setError("");
    setSuccess("");
    setFieldErrors({});
    const body: Record<string, unknown> = {};
    for (const field of fields) {
      if (field.multiple) body[field.name] = data.getAll(field.name);
      else if (field.type === "number") {
        const value = String(data.get(field.name) ?? "");
        if (value !== "") body[field.name] = Number(value);
      } else body[field.name] = String(data.get(field.name) ?? "").trim();
    }
    if (multipart) {
      const file = data.get("file");
      if (!(file instanceof File)
        || !["image/jpeg", "image/png", "image/webp"].includes(file.type)
        || !file.size || file.size > 5 * 1024 * 1024) {
        setError("Choose a JPEG, PNG, or WebP image up to 5 MiB.");
        setFieldErrors({ file: "Choose a supported image up to 5 MiB." });
        return;
      }
    }
    setPending(true);
    try {
      const result = await requestMutation(url, method, multipart ? data : body);
      setSuccess(typeof result.message === "string" ? result.message : "Saved successfully.");
      if (multipart) form.reset();
      if (redirectTo) router.push(redirectTo);
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to connect. Try again.");
      if (error instanceof MutationError) setFieldErrors(error.fields);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} aria-busy={pending} className="space-y-5">
      <fieldset disabled={pending} className="grid gap-5">
        <legend className="sr-only">{label}</legend>
        {fields.map((field) => {
          const controlId = `${id}-${field.name}`;
          const describedBy = `${controlId}-error${field.hint ? ` ${controlId}-hint` : ""}`;
          return (
            <div key={field.name} className="space-y-2">
              <label id={`${controlId}-label`} htmlFor={field.multiple ? undefined : controlId} className="block text-sm font-medium">
                {field.label}
              </label>
              {field.options ? field.multiple ? (
                <div role="group" aria-labelledby={`${controlId}-label`} aria-describedby={describedBy} className="grid gap-2 sm:grid-cols-2">
                  {field.options.map((option) => (
                    <label key={option.value} className="flex items-start gap-3 rounded-xl border border-white/10 p-3">
                      <input type="checkbox" name={field.name} value={option.value}
                        defaultChecked={String(field.value ?? "").split(",").includes(option.value)} className="mt-1" />
                      {option.label}
                    </label>
                  ))}
                </div>
              ) : (
                <select id={controlId} name={field.name} defaultValue={field.value ?? ""}
                  required={field.required} className="glass-input" aria-invalid={Boolean(fieldErrors[field.name])}
                  aria-describedby={describedBy}>
                  {field.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              ) : field.type === "textarea" ? (
                <textarea id={controlId} name={field.name} defaultValue={field.value}
                  maxLength={field.maxLength} rows={3} className="glass-input"
                  aria-invalid={Boolean(fieldErrors[field.name])} aria-describedby={describedBy} />
              ) : (
                <input id={controlId} name={field.name} type={field.type || "text"}
                  defaultValue={field.type === "file" ? undefined : field.value} required={field.required}
                  min={field.min} max={field.max} step={field.step} maxLength={field.maxLength}
                  accept={field.type === "file" ? "image/jpeg,image/png,image/webp" : undefined}
                  autoComplete={field.type === "email" ? "email" : undefined} className="glass-input"
                  aria-invalid={Boolean(fieldErrors[field.name])} aria-describedby={describedBy} />
              )}
              <p id={`${controlId}-error`} className="form-error">{fieldErrors[field.name]}</p>
              {field.hint && <p id={`${controlId}-hint`} className="text-muted text-sm">{field.hint}</p>}
            </div>
          );
        })}
      </fieldset>
      <p role="alert" className="form-error">{error}</p>
      {error.includes("session has expired") && <Link className="secondary-button" href="/login?reason=session">Log in</Link>}
      <p role="status" className="text-sm text-emerald-200">{success}</p>
      <button disabled={pending} className="primary-button">{pending ? "Saving…" : label}</button>
    </form>
  );
}

export function MutationButton({ url, method = "PATCH", body, label, confirmation, redirectTo }: {
  url: string;
  method?: string;
  body?: Record<string, unknown>;
  label: string;
  confirmation?: string;
  redirectTo?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const id = useId();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [open, setOpen] = useState(false);

  async function act() {
    if (pending) return;
    setPending(true);
    setError("");
    setSuccess("");
    try {
      const result = await requestMutation(url, method, body);
      dialog.current?.close();
      setSuccess(result.message || "Updated successfully.");
      if (redirectTo) router.push(redirectTo);
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to connect. Try again.");
      // Refresh a failed media deletion so its committed pending state is visible.
      if (method === "DELETE" && url.includes("/media/")) router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-2">
      <button disabled={pending} className="secondary-button" onClick={() => {
        setError("");
        if (confirmation) { dialog.current?.showModal(); setOpen(true); }
        else void act();
      }}>{pending ? "Updating…" : label}</button>
      {!open && <p role="alert" className="form-error">{error}</p>}
      <p role="status" className="text-sm text-emerald-200">{success}</p>
      {confirmation && (
        <dialog ref={dialog} aria-labelledby={id} aria-describedby={`${id}-description`}
          onKeyDown={(event) => {
            if (event.key !== "Tab") return;
            const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"));
            if (!buttons.length) { event.preventDefault(); return; }
            const first = buttons[0];
            const last = buttons[buttons.length - 1];
            if (event.shiftKey && document.activeElement === first) {
              event.preventDefault(); last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault(); first.focus();
            }
          }}
          onCancel={(event) => { if (pending) event.preventDefault(); }} onClose={() => setOpen(false)}
          className="glass-panel m-auto max-h-[90vh] w-[calc(100%_-_2rem)] max-w-md overflow-y-auto p-6 text-foreground backdrop:bg-black/70">
          <h2 id={id} className="text-xl font-semibold">{label}?</h2>
          <p id={`${id}-description`} className="text-muted my-4">{confirmation}</p>
          <p role="alert" className="form-error">{error}</p>
          <div className="flex flex-wrap gap-3">
            <button autoFocus disabled={pending} className="secondary-button" onClick={() => dialog.current?.close()}>Go back</button>
            <button disabled={pending} className="primary-button" onClick={() => void act()}>{pending ? "Updating…" : "Confirm"}</button>
          </div>
        </dialog>
      )}
    </div>
  );
}
