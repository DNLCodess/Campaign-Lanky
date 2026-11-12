"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { itemRatio } from "@/lib/gallery/layout";
import type { PublicEntry } from "@/lib/gallery/types";
import { MediaTile } from "./media-tile";

const STRIP_H_MOBILE = 220;
const STRIP_H_DESKTOP = 300;

export function formatTakenOn(takenOn: string): string {
  const d = new Date(`${takenOn}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return takenOn;
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

function countLine(entry: PublicEntry): string {
  const photos = entry.items.filter((i) => i.type === "image").length;
  const videos = entry.items.length - photos;
  const parts: string[] = [];
  if (photos) parts.push(plural(photos, "photo", "photos"));
  if (videos) parts.push(plural(videos, "video", "videos"));
  return parts.join(" · ");
}

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5 fill-none stroke-current" strokeWidth={2}>
      <path
        d={dir === "left" ? "M15 18l-6-6 6-6" : "M9 6l6 6-6 6"}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function OutingStrip({
  entry,
  onOpen,
}: {
  entry: PublicEntry;
  onOpen: (itemIndex: number) => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  const measure = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    const start = el.scrollLeft <= 2;
    const end = el.scrollLeft + el.clientWidth >= el.scrollWidth - 2;
    setEdges((prev) => (prev.start === start && prev.end === end ? prev : { start, end }));
  }, []);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    el.addEventListener("scroll", measure, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", measure);
    };
  }, [measure]);

  const scrollBy = (dir: 1 | -1) => {
    const el = scroller.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };

  const meta = [formatTakenOn(entry.takenOn), entry.place, countLine(entry)].filter(Boolean);
  const headingId = `${entry.slug}-title`;

  return (
    <section
      id={entry.slug}
      aria-labelledby={headingId}
      className="scroll-mt-32 [--strip-h:220px] sm:[--strip-h:300px]"
    >
      <div className="flex items-end justify-between gap-6">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent">
            {meta.map((m, i) => (
              <span key={i}>
                {i > 0 && <span aria-hidden className="mx-2 text-text-muted/50">·</span>}
                {m}
              </span>
            ))}
          </p>
          <h2
            id={headingId}
            className="mt-2 font-heading text-2xl leading-tight text-text sm:text-3xl"
          >
            <a href={`#${entry.slug}`} className="hover:text-accent-hover focus-visible:text-accent-hover">
              {entry.title}
            </a>
          </h2>
        </div>
        <div className="hidden shrink-0 gap-2 sm:flex">
          <button
            type="button"
            onClick={() => scrollBy(-1)}
            disabled={edges.start}
            aria-label={`Scroll ${entry.title} back`}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-text transition-colors hover:border-accent hover:text-accent disabled:pointer-events-none disabled:opacity-30"
          >
            <Chevron dir="left" />
          </button>
          <button
            type="button"
            onClick={() => scrollBy(1)}
            disabled={edges.end}
            aria-label={`Scroll ${entry.title} forward`}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-text transition-colors hover:border-accent hover:text-accent disabled:pointer-events-none disabled:opacity-30"
          >
            <Chevron dir="right" />
          </button>
        </div>
      </div>

      {entry.body && (
        <p className="mt-3 max-w-2xl whitespace-pre-line leading-relaxed text-text-muted">
          {entry.body}
        </p>
      )}

      <div
        ref={scroller}
        className="-mx-5 mt-6 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-5 px-5 pb-3 [scrollbar-width:thin] sm:mx-0 sm:scroll-px-0 sm:px-0"
      >
        {entry.items.map((item, i) => {
          const ratio = itemRatio(item);
          return (
            <div
              key={item.id}
              className="flex-none snap-start"
              style={{ width: `calc(var(--strip-h) * ${ratio})` }}
            >
              <MediaTile
                item={item}
                label={entry.title}
                onOpen={() => onOpen(i)}
                sizes={`(min-width: 640px) ${Math.ceil(STRIP_H_DESKTOP * ratio)}px, ${Math.ceil(STRIP_H_MOBILE * ratio)}px`}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
