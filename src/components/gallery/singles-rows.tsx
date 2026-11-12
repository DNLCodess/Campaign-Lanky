"use client";

import { itemRatio, tileFlex } from "@/lib/gallery/layout";
import type { PublicEntry } from "@/lib/gallery/types";
import { MediaTile } from "./media-tile";
import { formatTakenOn } from "./outing-strip";

const ROW_H_MOBILE = 160;
const ROW_H_DESKTOP = 240;
/**
 * A tile that wraps onto a row alone would otherwise grow to the full width
 * (a phone-width portrait becomes ~470px tall). Cap growth at 1.6x the target
 * height; such a row is then left-aligned instead of inflated.
 */
const MAX_GROW = 1.6;

/**
 * Justified rows: each tile's flex-grow is its ratio, so every tile in a wrapped
 * row grows to the same height and the row fills the width. The trailing spacer
 * soaks up the free space on the last row so it stays at target height.
 */
export function SinglesRows({
  entries,
  onOpen,
}: {
  entries: PublicEntry[];
  onOpen: (entryId: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-start gap-3">
      {entries.map((entry) => {
        const item = entry.items[0];
        if (!item) return null;
        const ratio = itemRatio(item);
        const caption = item.caption?.trim() || entry.title.trim();
        const mobile = tileFlex(ratio, ROW_H_MOBILE);
        const desktop = tileFlex(ratio, ROW_H_DESKTOP);
        return (
          <figure
            key={entry.id}
            id={entry.slug}
            className="m-0 min-w-0 scroll-mt-32 [flex-basis:var(--basis-m)] [max-width:var(--max-m)] sm:[flex-basis:var(--basis-d)] sm:[max-width:var(--max-d)]"
            style={
              {
                flexGrow: desktop.flexGrow,
                "--basis-m": mobile.flexBasis,
                "--basis-d": desktop.flexBasis,
                "--max-m": `${ratio * ROW_H_MOBILE * MAX_GROW}px`,
                "--max-d": `${ratio * ROW_H_DESKTOP * MAX_GROW}px`,
              } as React.CSSProperties
            }
          >
            <MediaTile
              item={item}
              label={entry.title || formatTakenOn(entry.takenOn)}
              onOpen={() => onOpen(entry.id)}
              sizes={`(min-width: 640px) min(${Math.ceil(ROW_H_DESKTOP * ratio * MAX_GROW)}px, 100vw), min(${Math.ceil(ROW_H_MOBILE * ratio * MAX_GROW)}px, 100vw)`}
            />
            {caption && (
              <figcaption className="mt-2 truncate text-sm text-text-muted" title={caption}>
                {caption}
              </figcaption>
            )}
          </figure>
        );
      })}
      <span aria-hidden style={{ flexGrow: 1e6, flexBasis: 0 }} />
    </div>
  );
}
