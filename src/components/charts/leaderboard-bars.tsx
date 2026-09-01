import { seriesColor } from "@/lib/chart-colors";

export type LeaderboardItem = {
  id: string;
  label: string;
  sublabel?: string;
  value: number;
  /** Position in a fixed, caller-defined order — color stays tied to this, never to rank. */
  colorIndex: number;
};

/**
 * Horizontal bar leaderboard — dataviz skill "compare magnitude, tell distinct
 * series apart" job, categorical color. Bars are ranked by value for display,
 * but each keeps the color of its stable identity (colorIndex), so a
 * candidate's color never changes as counts shift.
 *
 * Every bar carries its own name + value as a direct label, which is what
 * lets a single self-contained list skip a separate legend box (see
 * `showLegend` on the caller side for panels that repeat these same colors
 * elsewhere, where a shared key removes the need to re-learn the mapping).
 */
export function LeaderboardBars({
  items,
  scaleMax,
  unit = "votes",
}: {
  items: LeaderboardItem[];
  /** Shared x-scale across multiple panels, so bar lengths stay comparable. Defaults to this panel's own max. */
  scaleMax?: number;
  unit?: string;
}) {
  const total = items.reduce((s, i) => s + i.value, 0);
  const max = scaleMax ?? Math.max(1, ...items.map((i) => i.value));
  const ranked = [...items].sort((a, b) => b.value - a.value);

  return (
    <div className="space-y-3">
      {ranked.map((item) => {
        const pct = max > 0 ? Math.min(100, (item.value / max) * 100) : 0;
        const share = total > 0 ? Math.round((item.value / total) * 100) : 0;
        const color = seriesColor(item.colorIndex);
        return (
          <div key={item.id} className="group">
            <div className="flex items-baseline justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2 text-sm text-text">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: color }}
                  aria-hidden
                />
                <span className="truncate">{item.label}</span>
                {item.sublabel && <span className="shrink-0 text-xs text-text-muted">{item.sublabel}</span>}
              </span>
              <span className="shrink-0 text-sm text-text-muted">
                <span className="font-medium text-text">{item.value.toLocaleString()}</span> {unit}
                {total > 0 && <span className="ml-1.5">({share}%)</span>}
              </span>
            </div>
            <div className="mt-1.5 h-3 w-full overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full rounded-r-[4px] transition-[width] duration-500"
                style={{ width: `${pct}%`, backgroundColor: color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Compact dot+name key — for panels that repeat the same candidate colors elsewhere. */
export function LeaderboardLegend({ items }: { items: { id: string; label: string; colorIndex: number }[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5">
      {items.map((item) => (
        <span key={item.id} className="flex items-center gap-1.5 text-xs text-text-muted">
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: seriesColor(item.colorIndex) }}
            aria-hidden
          />
          {item.label}
        </span>
      ))}
    </div>
  );
}
