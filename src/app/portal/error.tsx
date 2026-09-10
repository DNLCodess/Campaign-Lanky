"use client";

/**
 * Portal-wide error boundary. Without this, an unexpected error in any portal
 * page falls through to the site-wide error page, which is styled for the
 * public campaign site, not a signed-in dashboard.
 */
export default function PortalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-5 py-24 text-center">
      <h1 className="font-heading text-2xl text-text">Something went wrong</h1>
      <p className="text-sm text-text-muted">
        That page failed to load. This is usually temporary — try again, and if it keeps happening let
        the constituency admin know.
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-brand bg-primary px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
      >
        Try again
      </button>
    </div>
  );
}
