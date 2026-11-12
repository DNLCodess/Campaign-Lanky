import type { FeedBlock, PublicItem } from "./types";

export type ViewerSequence = {
  items: PublicItem[];
  /** Per-item caption fallback (the owning entry's title). */
  titles: string[];
  startIndex: number;
};

const clamp = (n: number, len: number) => Math.min(Math.max(Math.trunc(n) || 0, 0), len - 1);

/**
 * What the full-screen viewer steps through when an item is opened:
 * an outing → that outing's items, starting at `itemIndex`;
 * a single → the singles block containing it (one item per entry, in order),
 * starting at that entry's position. Null when the entry is no longer in the feed.
 */
export function buildViewerSequence(
  blocks: FeedBlock[],
  entryId: string,
  itemIndex: number,
): ViewerSequence | null {
  for (const block of blocks) {
    if (block.type === "outing") {
      const { entry } = block;
      if (entry.id !== entryId) continue;
      if (entry.items.length === 0) return null;
      return {
        items: entry.items,
        titles: entry.items.map(() => entry.title),
        startIndex: clamp(itemIndex, entry.items.length),
      };
    }
    const withItems = block.entries.filter((e) => e.items.length > 0);
    const pos = withItems.findIndex((e) => e.id === entryId);
    if (pos === -1) {
      if (block.entries.some((e) => e.id === entryId)) return null; // present but empty
      continue;
    }
    return {
      items: withItems.map((e) => e.items[0]),
      titles: withItems.map((e) => e.title),
      startIndex: pos,
    };
  }
  return null;
}
