import type { Metadata } from "next";
import { AcceptInvitation } from "@/components/auth/link-flows";
import { isValidAuthToken } from "@/lib/auth/tokens";
import { requireUser } from "@/lib/auth/require-user";
import { AppError } from "@/lib/errors";
export const metadata: Metadata = { title: "Accept invitation", referrer: "no-referrer", robots: { index: false, follow: false } };
export default async function Page({ searchParams }: { searchParams: Promise<{ token?: string }> }) { const { token } = await searchParams; if (typeof token !== "string" || !isValidAuthToken(token)) return <div className="space-y-5"><h1 className="text-2xl font-semibold">Invalid invitation link</h1><p role="alert" className="form-error">Ask the business owner for a new invitation.</p></div>; const authenticated = await requireUser().then(() => true).catch((error: unknown) => { if (error instanceof AppError && error.statusCode === 401) return false; throw error; }); return <div className="space-y-6"><h1 className="text-2xl font-semibold">Accept staff invitation</h1><AcceptInvitation token={token} authenticated={authenticated} /></div>; }
