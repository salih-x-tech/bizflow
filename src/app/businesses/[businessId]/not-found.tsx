import Link from "next/link";
export default function NotFound() { return <section className="glass-panel space-y-5 p-8"><h1 className="text-2xl font-semibold">Record unavailable</h1><p className="text-muted">This record does not exist or you no longer have access to it.</p><Link href="/" className="secondary-button">Back to businesses</Link></section>; }
