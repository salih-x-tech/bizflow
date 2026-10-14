"use client";
import Link from "next/link";
export default function ErrorPage({ reset }: { reset: () => void }) { return <section className="glass-panel space-y-5 p-8"><h1 className="text-2xl font-semibold">Unable to load this workspace</h1><p role="alert" className="text-muted">The service may be temporarily unavailable. Retry, or return to your businesses.</p><button onClick={reset} className="primary-button">Try again</button><Link className="secondary-button" href="/">Businesses</Link></section>; }
