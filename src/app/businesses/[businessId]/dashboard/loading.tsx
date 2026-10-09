export default function DashboardLoading() {
  return (
    <div
      role="status"
      aria-label="Loading dashboard"
      className="space-y-6"
    >
      <span className="sr-only">Loading dashboard…</span>

      <div aria-hidden="true" className="space-y-6 animate-pulse">
        <div className="space-y-3">
          <div className="h-9 w-48 rounded-lg bg-white/10" />
          <div className="h-5 w-full max-w-sm rounded bg-white/5" />
        </div>

        <div className="glass-panel space-y-4 p-6">
          <div className="h-4 w-40 rounded bg-white/10" />
          <div className="h-10 w-52 max-w-full rounded-lg bg-white/10" />
          <div className="h-4 w-36 rounded bg-white/5" />
        </div>

        {[0, 1].map((section) => (
          <div key={section} className="glass-panel p-6">
            <div className="mb-6 h-6 w-40 rounded bg-white/10" />

            <div className="divide-y divide-white/10">
              {[0, 1, 2].map((row) => (
                <div
                  key={row}
                  className="flex items-center justify-between gap-4 py-4"
                >
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="h-4 w-full max-w-44 rounded bg-white/10" />
                    <div className="h-3 w-24 rounded bg-white/5" />
                  </div>

                  <div className="h-6 w-20 shrink-0 rounded-full bg-white/10" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}