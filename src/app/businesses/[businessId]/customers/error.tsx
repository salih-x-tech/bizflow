"use client";

export default function CustomersError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section
      role="alert"
      aria-labelledby="customers-error-heading"
      className="glass-panel space-y-5 p-6 sm:p-10"
    >
      <div className="space-y-3">
        <h2
          id="customers-error-heading"
          className="text-2xl font-semibold"
        >
          Unable to load customers
        </h2>

        <p className="text-muted max-w-lg leading-7">
          Something went wrong while loading customer records.
          Please try again.
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