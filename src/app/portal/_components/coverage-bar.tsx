import { STATUS_COLORS } from "@/lib/chart-colors";

/**
 * Compact inline coverage indicator — used beside text in tight rows (ward
 * accordion headers), where the stacked block layout of the shared `Meter`
 * component doesn't fit. Same status-color logic as Meter's `tone="status"`,
 * just laid out horizontally.
 */
export function CoverageBar({ covered, total }: { covered: number; total: number }) {
  const pct = total > 0 ? Math.round((covered / total) * 100) : 0;
  const color = pct >= 80 ? STATUS_COLORS.good : pct >= 40 ? STATUS_COLORS.warning : STATUS_COLORS.critical;

  return (
    <div className="flex items-center gap-3">
      <div className="h-2 w-32 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-r-[4px]" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs text-text-muted">
        {covered}/{total} ({pct}%)
      </span>
    </div>
  );
}
