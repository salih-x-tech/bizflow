import type { Metadata } from "next";
import Link from "next/link";
import { RegisterForm } from "@/components/auth/register-form";
import { isValidAuthToken } from "@/lib/auth/tokens";

export const metadata: Metadata = {
  title: "Create account",
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ invitation?: string }> }) {
  const input = (await searchParams).invitation;
  const invitation = typeof input === "string" && isValidAuthToken(input) ? input : "";
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Create your account
        </h1>

        <p className="text-muted text-sm leading-6">
          Get started with BizFlow and bring your business
          into one place.
        </p>
      </header>

      <RegisterForm invitation={invitation} />

      <p className="text-muted text-center text-sm">
        Already have an account?{" "}
        <Link
          prefetch={false}
          href={invitation ? `/login?invitation=${encodeURIComponent(invitation)}` : "/login"}
          className="rounded text-indigo-300 underline-offset-4 hover:underline"
        >
          Log in
        </Link>
      </p>
    </div>
  );
}
