"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { loadGalleryPage } from "@/app/gallery/actions";
import { appendFeed, groupFeed } from "@/lib/gallery/feed";
import type { FeedBlock, FeedPage } from "@/lib/gallery/types";
import { OutingStrip } from "./outing-strip";
import { SinglesRows } from "./singles-rows";

/** What the full-screen viewer (Task 8) opens at. */
export type ViewerTarget = { entryId: string; itemIndex: number };

export function GalleryFeed({ initial }: { initial: FeedPage }) {
  const [blocks, setBlocks] = useState<FeedBlock[]>(() => groupFeed(initial.entries));
  const [cursor, setCursor] = useState<string | null>(initial.nextCursor);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const inFlight = useRef(false);
  const seen = useRef(new Set(initial.entries.map((e) => e.id)));
  const sentinel = useRef<HTMLDivElement>(null);

  // Hook point for the viewer: Task 8 renders it from this state.
  const [, setViewer] = useState<ViewerTarget | null>(null);
  const openViewer = useCallback((entryId: string, itemIndex: number) => {
    setViewer({ entryId, itemIndex });
  }, []);

  const loadMore = useCallback(async () => {
    if (!cursor || inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    setFailed(false);
    try {
      const page = await loadGalleryPage(cursor);
      const fresh = page.entries.filter((e) => !seen.current.has(e.id));
      for (const e of fresh) seen.current.add(e.id);
      setBlocks((prev) => appendFeed(prev, fresh));
      setCursor(page.nextCursor);
    } catch {
      setFailed(true);
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }, [cursor]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !cursor || failed || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (records) => {
        if (records.some((r) => r.isIntersecting)) void loadMore();
      },
      { rootMargin: "800px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [cursor, failed, loadMore]);

  return (
    <div>
      <div className="space-y-16 sm:space-y-20">
        {blocks.map((block) =>
          block.type === "outing" ? (
            <OutingStrip
              key={block.entry.id}
              entry={block.entry}
              onOpen={(i) => openViewer(block.entry.id, i)}
            />
          ) : (
            <SinglesRows
              key={`singles-${block.entries[0]?.id}`}
              entries={block.entries}
              onOpen={(entryId) => openViewer(entryId, 0)}
            />
          ),
        )}
      </div>

      {cursor && (
        <div ref={sentinel} className="mt-16 flex flex-col items-center gap-3">
          {failed && (
            <p role="status" className="text-sm text-text-muted">
              Couldn&apos;t load more photos. Check your connection and try again.
            </p>
          )}
          <button
            type="button"
            onClick={() => void loadMore()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-brand border border-border px-6 py-3 text-sm font-medium text-text transition-colors hover:border-accent hover:text-accent disabled:cursor-wait disabled:opacity-60"
          >
            {loading && (
              <span
                aria-hidden
                className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
              />
            )}
            {loading ? "Loading…" : "Load more"}
          </button>
        </div>
      )}
    </div>
  );
}
