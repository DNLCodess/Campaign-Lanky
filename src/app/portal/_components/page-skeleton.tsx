/**
 * Shared loading placeholder for portal pages. Rendered by each section's
 * `loading.tsx` while its server component awaits data, so the sidebar (from
 * the sibling layout) stays put and only the content area shows a skeleton
 * instead of the page hanging blank.
 */
export function PagePlaceholder() {
  return (
    <div className="mx-auto max-w-4xl animate-pulse space-y-8" aria-hidden>
      <div className="space-y-2">
        <div className="h-7 w-56 rounded-brand bg-surface-2" />
        <div className="h-4 w-72 rounded-brand bg-surface-2/70" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 rounded-brand border border-border bg-surface/40" />
        ))}
      </div>
      <div className="space-y-3 rounded-brand border border-border bg-surface/40 p-6">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-4 rounded-brand bg-surface-2/70" style={{ width: `${90 - i * 12}%` }} />
        ))}
      </div>
    </div>
  );
}
