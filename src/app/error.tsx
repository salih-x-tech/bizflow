"use client";
import Link from "next/link";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto my-10 w-full max-w-2xl px-4">
      <section className="glass-panel space-y-5 p-8">
        <h1 className="text-2xl font-semibold">Unable to load this page</h1>
        <p role="alert" className="text-muted">The service may be temporarily unavailable. Your saved records remain available when the connection returns.</p>
        <button className="primary-button" onClick={reset}>Try again</button>
        <Link className="secondary-button" href="/login">Back to login</Link>
      </section>
    </main>
  );
}
