"use client";

export default function DashboardError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section
      role="alert"
      aria-labelledby="dashboard-error-heading"
      className="glass-panel space-y-5 p-6 sm:p-10"
    >
      <div className="space-y-3">
        <h2
          id="dashboard-error-heading"
          className="text-2xl font-semibold"
        >
          Unable to load your dashboard
        </h2>

        <p className="text-muted max-w-lg leading-7">
          Something went wrong while loading your business
          metrics. Please try again.
        </p>
      </div>

      <button
        type="button"
        onClick={() => reset()}
        className="primary-button"
      >
        Try again
      </button>
    </section>
  );
}