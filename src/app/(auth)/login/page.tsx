import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";
import Link from "next/link";
import { isValidAuthToken } from "@/lib/auth/tokens";


export const metadata: Metadata = {
  title: "Login",
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ invitation?: string; reason?: string }> }) {
  const query = await searchParams;
  const input = query.invitation;
  const invitation = typeof input === "string" && isValidAuthToken(input) ? input : "";
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome back
        </h1>

        <p className="text-muted text-sm leading-6">
          Log in to continue managing your business.
        </p>
      </header>

      {query.reason === "session" && <p role="alert" className="form-error">Your session has expired or is no longer valid. Log in again to continue.</p>}
      <LoginForm invitation={invitation} />
      <Link href="/forgot-password" className="text-sm text-indigo-300">Forgot password?</Link>

      <p className="text-muted text-center text-sm">
        New to BizFlow?{" "}
        <Link
            prefetch={false}
            href={invitation ? `/register?invitation=${encodeURIComponent(invitation)}` : "/register"}
            className="rounded text-indigo-300 underline-offset-4 hover:underline"
        >
            Create an account
        </Link>
        </p>
    </div>
  );
}
