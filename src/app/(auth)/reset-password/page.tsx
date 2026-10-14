import Link from "next/link";
import type { Metadata } from "next";
import { RecoveryForm } from "@/components/auth/link-flows";
import { isValidAuthToken } from "@/lib/auth/tokens";
export const metadata: Metadata = { title: "Reset password", referrer: "no-referrer", robots: { index: false, follow: false } };
export default async function Page({ searchParams }: { searchParams: Promise<{ token?: string }> }) { const { token } = await searchParams; return <div className="space-y-6"><h1 className="text-2xl font-semibold">Reset password</h1>{typeof token === "string" && isValidAuthToken(token) ? <RecoveryForm token={token} /> : <><p role="alert" className="form-error">This password reset link is invalid. Request a new link.</p><Link className="primary-button" href="/forgot-password">Request reset link</Link></>}</div>; }
