export function CoverageBar({ covered, total }: { covered: number; total: number }) {
  const pct = total > 0 ? Math.round((covered / total) * 100) : 0;
  const color = pct >= 80 ? "bg-accent" : pct >= 40 ? "bg-primary/70" : "bg-primary";

  return (
    <div className="flex items-center gap-3">
      <div className="h-2 w-32 overflow-hidden rounded-full bg-surface-2">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-text-muted">
        {covered}/{total} ({pct}%)
      </span>
    </div>
  );
}
