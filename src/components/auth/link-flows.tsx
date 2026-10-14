"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { requestMutation } from "@/components/workspace/mutation-form";
export function RecoveryForm({ token }: { token?: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (pending) return;
    const data = new FormData(event.currentTarget);
    setError(""); setSuccess("");
    const password = String(data.get("password") || "");
    const confirmPassword = String(data.get("confirmPassword") || "");
    if (token && (password.length < 12 || new TextEncoder().encode(password).length > 72 || password !== confirmPassword)) { setError("Use at least 12 characters, at most 72 UTF-8 bytes, and matching passwords."); return; }
    setPending(true);
    try { const result = await requestMutation(`/api/auth/${token ? "reset-password" : "forgot-password"}`, "POST", token ? { token, password, confirmPassword } : { email: String(data.get("email") || "").trim() }); setSuccess(result.message); }
    catch (error) { setError(error instanceof Error ? error.message : "Unable to connect. Try again."); }
    finally { setPending(false); }
  }
  if (token && success) return <div className="space-y-5"><p role="status" className="text-emerald-200">{success}</p><Link className="primary-button" href="/login">Log in</Link></div>;
  return <form onSubmit={submit} aria-busy={pending} className="space-y-5"><fieldset disabled={pending} className="space-y-5"><legend className="sr-only">{token ? "Choose a new password" : "Request reset link"}</legend>{token ? <>{["password", "confirmPassword"].map((name) => <label key={name} className="block space-y-2"><span>{name === "password" ? "New password" : "Confirm new password"}</span><input name={name} type="password" required minLength={12} maxLength={72} autoComplete="new-password" className="glass-input" /></label>)}<p className="text-muted text-sm">At least 12 characters; maximum 72 UTF-8 bytes. Resetting your password signs out all existing sessions.</p></> : <label className="block space-y-2"><span>Email address</span><input name="email" type="email" required maxLength={254} autoComplete="email" className="glass-input" /></label>}</fieldset><p role="alert" className="form-error">{error}</p><p role="status" className="text-emerald-200">{success}</p><button disabled={pending} className="primary-button">{pending ? "Submitting…" : token ? "Reset password" : "Send reset link"}</button><Link className="secondary-button" href="/login">Back to login</Link></form>;
}
export function AcceptInvitation({ token, authenticated }: { token: string; authenticated: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const context = `?invitation=${encodeURIComponent(token)}`;
  async function accept() {
    if (pending) return;
    setPending(true); setError("");
    try { const result = await requestMutation("/api/staff-invitations/accept", "POST", { token }); router.replace(`/businesses/${result.business.id}`); router.refresh(); }
    catch (error) { setError(error instanceof Error ? error.message : "Unable to connect. Try again."); }
    finally { setPending(false); }
  }
  return <div className="space-y-5"><p className="text-muted">Sign in with the email address that received this invitation. Acceptance activates your membership with the permissions chosen by the owner.</p>{authenticated ? <button className="primary-button" disabled={pending} onClick={() => void accept()}>{pending ? "Accepting…" : "Accept invitation"}</button> : <div className="flex flex-wrap gap-3"><Link prefetch={false} className="primary-button" href={`/login${context}`}>Log in to accept</Link><Link prefetch={false} className="secondary-button" href={`/register${context}`}>Create account</Link></div>}<p role="alert" className="form-error">{error}</p>{error && <p className="text-muted text-sm">If the link has expired or was revoked, ask the owner for a new invitation. Use the invited account if the email does not match.</p>}{authenticated && <Link prefetch={false} className="text-indigo-300" href={`/login${context}`}>Sign in with another account</Link>}</div>;
}
