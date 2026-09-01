import { STATUS_COLORS } from "@/lib/chart-colors";

/**
 * Single-value proportion — dataviz skill "meter" figure. Fill carries
 * magnitude; the unfilled track is a lighter step of the same ramp (here:
 * the brand accent at reduced opacity over the surface, since this brand
 * doesn't have its own validated multi-step ramp to draw a literal step
 * from — opacity achieves the same "lighter step of the same hue" effect).
 *
 * `tone="status"` switches the fill to the skill's fixed status scale
 * (good/warning/critical by threshold) for gap-severity contexts like
 * coverage — always paired with a text label per the status-color rule
 * (never color alone).
 */
export function Meter({
  value,
  max,
  label,
  unit,
  tone = "accent",
}: {
  value: number;
  max: number;
  label?: string;
  unit?: string;
  tone?: "accent" | "status";
}) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  const statusLabel = pct >= 80 ? "Good coverage" : pct >= 40 ? "Partial" : "Needs agents";
  const statusColor = pct >= 80 ? STATUS_COLORS.good : pct >= 40 ? STATUS_COLORS.warning : STATUS_COLORS.critical;

  return (
    <div>
      {label && (
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-sm text-text">{label}</span>
          <span className="text-sm text-text-muted">
            <span className="font-medium text-text">
              {value.toLocaleString()}/{max.toLocaleString()}
            </span>{" "}
            {unit ?? `(${Math.round(pct)}%)`}
          </span>
        </div>
      )}
      <div className={`h-3 w-full overflow-hidden rounded-full ${tone === "accent" ? "bg-accent/20" : "bg-surface-2"}`}>
        <div
          className={`h-full rounded-r-[4px] transition-[width] duration-500 ${tone === "accent" ? "bg-accent" : ""}`}
          style={tone === "status" ? { width: `${pct}%`, backgroundColor: statusColor } : { width: `${pct}%` }}
        />
      </div>
      {tone === "status" && (
        <p className="mt-1 flex items-center gap-1.5 text-xs text-text-muted">
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: statusColor }} aria-hidden />
          {statusLabel} — {Math.round(pct)}%
        </p>
      )}
    </div>
  );
}
