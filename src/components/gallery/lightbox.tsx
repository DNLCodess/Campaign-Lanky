"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PublicItem } from "@/lib/gallery/types";
import { LightboxSlide } from "./lightbox-slide";

const SWIPE_PX = 50;
/** Ignore swipes that start over a video's native control bar. */
const VIDEO_CONTROLS_PX = 64;

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-6 w-6 fill-none stroke-current" strokeWidth={2}>
      <path d={d} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function kindWord(item: PublicItem) {
  return item.type === "image" ? "Photo" : "Video";
}

/** Preload neighbouring images (not videos) at the size the viewer will ask for. */
function preload(item: PublicItem | undefined) {
  if (!item || item.type !== "image" || !item.src) return;
  const img = new Image();
  img.decoding = "async";
  img.sizes = "100vw";
  if (item.srcSet) img.srcset = item.srcSet;
  img.src = item.src;
}

export function Lightbox({
  items,
  startIndex,
  title,
  titles,
  onClose,
}: {
  items: PublicItem[];
  startIndex: number;
  /** Caption fallback for every item. */
  title?: string;
  /** Per-item caption fallback; wins over `title`. */
  titles?: string[];
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [index, setIndex] = useState(() => Math.min(Math.max(startIndex, 0), items.length - 1));
  const [drag, setDrag] = useState(0);
  // Only the tapped item may auto-play, and only until the user first navigates.
  const [navigated, setNavigated] = useState(false);
  // The tile that opened the viewer, for focus restoration.
  const openerId = useRef(items[startIndex]?.id);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const count = items.length;
  const current = Math.min(index, count - 1);
  const item = items[current];
  const hasPrev = current > 0;
  const hasNext = current < count - 1;

  const go = useCallback(
    (delta: number) => {
      setNavigated(true);
      setIndex((i) => Math.min(Math.max(i + delta, 0), count - 1));
    },
    [count],
  );

  // Open as a modal; on close *or unmount* undo the scroll lock and return focus.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const root = document.documentElement;
    const prevOverflow = root.style.overflow;
    root.style.overflow = "hidden";
    if (!dialog.open) dialog.showModal();
    const opener = openerId.current;
    return () => {
      if (dialog.open) dialog.close();
      root.style.overflow = prevOverflow;
      if (opener) {
        const tile = document.querySelector<HTMLElement>(`[data-gallery-item="${CSS.escape(opener)}"]`);
        tile?.focus({ preventScroll: true });
      }
    };
  }, []);

  useEffect(() => {
    preload(items[current + 1]);
    preload(items[current - 1]);
  }, [items, current]);

  // Listen on the document, not the dialog: when an arrow button unmounts at
  // either end of the sequence, focus falls back to <body> and keys would be lost.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Arrow keys on a focused video seek it; leave those alone.
      if (e.target instanceof HTMLVideoElement || e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        go(1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        go(-1);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [go]);

  // --- Pointer swipe -------------------------------------------------------
  const pointers = useRef(new Set<number>());
  const gesture = useRef<{ id: number; x: number; y: number; horizontal: boolean | null } | null>(null);

  const endGesture = () => {
    gesture.current = null;
    setDrag(0);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLElement>) => {
    pointers.current.add(e.pointerId);
    // Second finger = pinch: abandon the swipe and let the browser zoom.
    if (pointers.current.size > 1) return endGesture();
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if ((window.visualViewport?.scale ?? 1) > 1.01) return; // panning a zoomed page
    const target = e.target as HTMLElement;
    if (target.closest("button")) return;
    if (target instanceof HTMLVideoElement) {
      const r = target.getBoundingClientRect();
      if (e.clientY > r.bottom - VIDEO_CONTROLS_PX) return;
    }
    gesture.current = { id: e.pointerId, x: e.clientX, y: e.clientY, horizontal: null };
    // Keep receiving move/up when a mouse drag leaves the stage.
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
  };

  const onPointerMove = (e: React.PointerEvent) => {
    // No buttons down means any tracked pointers are stale (an up we never saw).
    if (e.buttons === 0 && pointers.current.size > 0) {
      pointers.current.clear();
      if (gesture.current) endGesture();
      return;
    }
    const g = gesture.current;
    if (!g || g.id !== e.pointerId) return;
    const dx = e.clientX - g.x;
    const dy = e.clientY - g.y;
    if (g.horizontal === null && Math.hypot(dx, dy) > 8) g.horizontal = Math.abs(dx) > Math.abs(dy);
    if (!g.horizontal) return;
    // Rubber-band at either end of the sequence.
    const atEdge = (dx > 0 && !hasPrev) || (dx < 0 && !hasNext);
    setDrag(atEdge ? dx / 4 : dx);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    const g = gesture.current;
    if (!g || g.id !== e.pointerId) return;
    const dx = e.clientX - g.x;
    const dy = e.clientY - g.y;
    endGesture();
    if (g.horizontal && Math.abs(dx) >= SWIPE_PX && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1);
  };

  const onPointerCancel = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (gesture.current?.id === e.pointerId) endGesture();
  };

  if (!item) return null;

  const fallback = titles?.[current]?.trim() || title?.trim() || "";
  const caption = item.caption?.trim() || fallback;
  const label = caption || `${kindWord(item)} ${current + 1}`;

  return (
    <dialog
      ref={dialogRef}
      aria-label="Gallery viewer"
      onCancel={(e) => {
        e.preventDefault();
        onCloseRef.current();
      }}
      // Safety net: if the browser closes the dialog itself, sync React state.
      // (Guarded: a StrictMode remount reopens the dialog before the queued event fires.)
      onClose={() => {
        if (!dialogRef.current?.open) onCloseRef.current();
      }}
      className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none overflow-hidden bg-black p-0 text-white backdrop:bg-black"
    >
      <div className="flex h-full flex-col">
        <div
          className="flex shrink-0 items-center justify-between gap-4 px-4 pb-2 sm:px-6"
          style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
        >
          <button
            type="button"
            onClick={() => onCloseRef.current()}
            aria-label="Close viewer"
            className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full text-white/85 outline-none transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-accent"
          >
            <Icon d="M6 6l12 12M18 6L6 18" />
          </button>
          {count > 1 && (
            <p className="text-sm font-medium tabular-nums tracking-wide text-white/75">
              {current + 1} / {count}
            </p>
          )}
        </div>

        <div
          className="relative min-h-0 flex-1 touch-pan-y touch-pinch-zoom select-none [container-type:size]"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
        >
          <div
            className={`absolute inset-0 ${drag === 0 ? "transition-transform duration-200 ease-out" : ""}`}
            style={{ transform: drag ? `translate3d(${drag}px,0,0)` : undefined }}
          >
            <LightboxSlide key={item.id} item={item} label={label} autoPlay={!navigated} />
          </div>

          {hasPrev && (
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous"
              className="absolute left-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white outline-none backdrop-blur-sm transition-colors hover:bg-black/70 focus-visible:ring-2 focus-visible:ring-accent sm:left-4 sm:h-12 sm:w-12"
            >
              <Icon d="M15 18l-6-6 6-6" />
            </button>
          )}
          {hasNext && (
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next"
              className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white outline-none backdrop-blur-sm transition-colors hover:bg-black/70 focus-visible:ring-2 focus-visible:ring-accent sm:right-4 sm:h-12 sm:w-12"
            >
              <Icon d="M9 6l6 6-6 6" />
            </button>
          )}
        </div>

        <div
          className="shrink-0 px-5 pt-3 text-center sm:px-8"
          style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
        >
          <p className="mx-auto line-clamp-3 min-h-[1.5rem] max-w-3xl text-sm leading-relaxed text-white/85 sm:text-base">
            {caption}
          </p>
        </div>

        <p aria-live="polite" className="sr-only">
          {`${kindWord(item)} ${current + 1} of ${count}${caption ? `: ${caption}` : ""}`}
        </p>
      </div>
    </dialog>
  );
}
