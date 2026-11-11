import type { PublicItem } from "./types";

const MIN_RATIO = 0.5;
const MAX_RATIO = 2.5;

export function clampRatio(w: number, h: number): { ratio: number; clamped: boolean } {
  const raw = w / h;
  if (!Number.isFinite(raw) || raw <= 0) return { ratio: 1, clamped: true };
  if (raw > MAX_RATIO) return { ratio: MAX_RATIO, clamped: true };
  if (raw < MIN_RATIO) return { ratio: MIN_RATIO, clamped: true };
  return { ratio: raw, clamped: false };
}

export function tileFlex(ratio: number, rowHeight: number): { flexGrow: number; flexBasis: string } {
  return { flexGrow: ratio, flexBasis: `${ratio * rowHeight}px` };
}

export function itemRatio(item: PublicItem): number {
  return clampRatio(item.width, item.height).ratio;
}
