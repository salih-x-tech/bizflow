export default function CustomersLoading() {
  return (
    <div role="status" aria-label="Loading customers">
      <span className="sr-only">Loading customers…</span>

      <div
        aria-hidden="true"
        className="animate-pulse space-y-6"
      >
        <div className="space-y-3">
          <div className="h-9 w-44 rounded-lg bg-white/10" />
          <div className="h-5 w-full max-w-sm rounded bg-white/5" />
        </div>

        <div className="glass-panel grid gap-4 p-5 sm:grid-cols-3">
          {[0, 1, 2].map((field) => (
            <div
              key={field}
              className="h-12 rounded-xl bg-white/10"
            />
          ))}
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          {[0, 1, 2, 3].map((card) => (
            <div key={card} className="glass-panel space-y-5 p-5">
              <div className="h-6 w-40 max-w-full rounded bg-white/10" />

              <div className="space-y-3">
                <div className="h-4 w-full max-w-52 rounded bg-white/5" />
                <div className="h-4 w-32 rounded bg-white/5" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}