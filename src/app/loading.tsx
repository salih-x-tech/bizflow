export default function Loading() {
  return (
    <main className="mx-auto my-10 w-full max-w-5xl px-4" role="status" aria-label="Loading page">
      <span className="sr-only">Loading…</span>
      <div className="grid gap-5 sm:grid-cols-2">
        {[1, 2, 3, 4].map((card) => <div key={card} className="glass-panel h-40 animate-pulse bg-white/10" />)}
      </div>
    </main>
  );
}
