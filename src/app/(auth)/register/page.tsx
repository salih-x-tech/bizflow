import type { Metadata } from "next";
import Link from "next/link";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = {
  title: "Create account",
};

export default function RegisterPage() {
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

      <RegisterForm />

      <p className="text-muted text-center text-sm">
        Already have an account?{" "}
        <Link
          href="/login"
          className="rounded text-indigo-300 underline-offset-4 hover:underline"
        >
          Log in
        </Link>
      </p>
    </div>
  );
}