import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";
import Link from "next/link";


export const metadata: Metadata = {
  title: "Login",
};

export default function LoginPage() {
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

      <LoginForm />

      <p className="text-muted text-center text-sm">
        New to BizFlow?{" "}
        <Link
            href="/register"
            className="rounded text-indigo-300 underline-offset-4 hover:underline"
        >
            Create an account
        </Link>
        </p>
    </div>
  );
}