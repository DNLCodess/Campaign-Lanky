import Link from "next/link";
import { Reveal } from "@/components/motion/reveal";
import { getTeaserEntries } from "@/lib/gallery/queries";
import { itemRatio, tileFlex } from "@/lib/gallery/layout";
import { MediaTile } from "./media-tile";

const ROW_H_MOBILE = 160;
const ROW_H_DESKTOP = 240;
// Same growth cap as SinglesRows so a lone wrapped tile is not inflated.
const MAX_GROW = 1.6;

export async function GalleryTeaser() {
  const entries = await getTeaserEntries(6);
  if (entries.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
      <Reveal className="flex items-end justify-between gap-4">
        <div>
          <h2 className="font-heading text-3xl text-text sm:text-4xl">Gallery &amp; videos</h2>
          <p className="mt-4 max-w-xl text-text-muted">
            Moments with market women, community elders, and youth groups.
          </p>
        </div>
      </Reveal>

      <div className="mt-10 flex flex-wrap items-start gap-3">
        {entries.map((entry) => {
          const item = entry.items[0];
          if (!item) return null;
          const ratio = itemRatio(item);
          const mobile = tileFlex(ratio, ROW_H_MOBILE);
          const desktop = tileFlex(ratio, ROW_H_DESKTOP);
          const title = entry.title.trim() || item.caption?.trim() || "Gallery";
          return (
            <Link
              key={entry.id}
              href={`/gallery#${entry.slug}`}
              aria-label={`View in gallery: ${title}`}
              className="block min-w-0 [flex-basis:var(--basis-m)] [max-width:var(--max-m)] sm:[flex-basis:var(--basis-d)] sm:[max-width:var(--max-d)]"
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
                sizes={`(min-width: 640px) min(${Math.ceil(ROW_H_DESKTOP * ratio * MAX_GROW)}px, 100vw), min(${Math.ceil(ROW_H_MOBILE * ratio * MAX_GROW)}px, 100vw)`}
              />
            </Link>
          );
        })}
        <span aria-hidden style={{ flexGrow: 1e6, flexBasis: 0 }} />
      </div>

      <Link
        href="/gallery"
        className="mt-8 inline-block text-sm font-semibold text-accent transition-colors hover:text-text"
      >
        See the full gallery &rarr;
      </Link>
    </section>
  );
}
