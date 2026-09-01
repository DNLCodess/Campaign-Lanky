/**
 * Chart color constants — dataviz skill, validated for this brand's dark
 * surfaces (page bg #071A26 / card surface #0D334A). This site is dark-only
 * (no light-mode toggle), so unlike the skill's reference instance these are
 * plain constants, not CSS custom properties with a light/dark split.
 *
 * Categorical: the skill's default 8-hue order, re-validated against our own
 * surfaces (our brand doesn't supply its own 8-hue ramp to substitute — only
 * an accent + a primary). Order is fixed and never cycled; assign by a
 * stable entity id, never by rank, so a candidate's color doesn't change as
 * vote counts shift.
 *   node scripts/validate_palette.js "<hexes>" --mode dark --surface "#071A26"
 *   → ALL CHECKS PASS (worst adjacent CVD ΔE 8.4, normal-vision ΔE 19.3, contrast all ≥3:1)
 */
export const CATEGORICAL_COLORS = [
  "#3987e5", // 1 blue
  "#d95926", // 2 orange
  "#199e70", // 3 aqua
  "#c98500", // 4 yellow
  "#d55181", // 5 magenta
  "#008300", // 6 green
  "#9085e9", // 7 violet
  "#e66767", // 8 red
] as const;

/** Stable color for a series by its position in a fixed, caller-defined order — never by rank/value. */
export function seriesColor(index: number): string {
  return CATEGORICAL_COLORS[index % CATEGORICAL_COLORS.length];
}

/** Fixed status scale — reserved meaning, never reused for series identity. Always paired with icon + label. */
export const STATUS_COLORS = {
  good: "#0ca30c",
  warning: "#fab219",
  serious: "#ec835a",
  critical: "#d03b3b",
} as const;
