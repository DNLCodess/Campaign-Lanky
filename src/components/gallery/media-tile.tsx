"use client";

import { useCallback, useState } from "react";
import { clampRatio } from "@/lib/gallery/layout";
import { youTubeThumb } from "@/lib/gallery/youtube";
import type { PublicItem } from "@/lib/gallery/types";

/** Branded backdrop shown behind clamped / letterboxed media. */
export const GALLERY_BACKDROP = "#0b2a3d";

export function formatDuration(seconds: number | null): string | null {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return null;
  const total = Math.round(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function itemLabel(item: PublicItem, fallback?: string): string {
  const text = item.caption?.trim() || fallback?.trim();
  const kind = item.type === "image" ? "photo" : item.type === "youtube" ? "YouTube video" : "video";
  return text ? `Open ${kind}: ${text}` : `Open ${kind}`;
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-3.5 w-3.5 fill-current">
      <path d="M8 5.14v13.72a1 1 0 0 0 1.52.85l10.6-6.86a1 1 0 0 0 0-1.7L9.52 4.29A1 1 0 0 0 8 5.14Z" />
    </svg>
  );
}

/**
 * One aspect-true gallery tile. The box takes its layout ratio from the item's
 * stored dimensions (clamped to 0.5–2.5), so space is reserved before the image
 * arrives. The parent decides the width; the height follows from the ratio.
 */
export function MediaTile({
  item,
  onOpen,
  sizes,
  label,
  className = "",
}: {
  item: PublicItem;
  onOpen: () => void;
  sizes: string;
  /** Fallback text for the accessible label when the item has no caption. */
  label?: string;
  className?: string;
}) {
  const isYouTube = item.type === "youtube";
  // YouTube boxes are fixed 16:9 / 9:16 (stored dims) and the 4:3 thumbnail is
  // letterboxed inside, so they always get the backdrop.
  const { ratio, clamped } = clampRatio(item.width, item.height);
  const contained = clamped || isYouTube;

  const [loaded, setLoaded] = useState(false);
  // Catch images that finished loading before hydration (onLoad never fires).
  const imgRef = useCallback((img: HTMLImageElement | null) => {
    if (img?.complete && img.naturalWidth > 0) setLoaded(true);
  }, []);

  const src = isYouTube && item.youtubeId ? youTubeThumb(item.youtubeId) : item.src;
  const duration = item.type === "video" ? formatDuration(item.durationS) : null;
  const blur = !loaded && item.blur ? `url("${item.blur}")` : undefined;

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={itemLabel(item, label)}
      className={`group relative block w-full cursor-zoom-in overflow-hidden rounded-[0.5rem] outline-none ring-accent/0 transition-shadow duration-200 hover:ring-2 hover:ring-accent/60 focus-visible:ring-2 focus-visible:ring-accent ${className}`}
      style={{
        aspectRatio: ratio,
        backgroundColor: GALLERY_BACKDROP,
        backgroundImage: blur,
        backgroundSize: contained ? "contain" : "100% 100%",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {src && (
        // eslint-disable-next-line @next/next/no-img-element -- variants are pre-generated; srcset served straight from storage
        <img
          ref={imgRef}
          src={src}
          srcSet={isYouTube ? undefined : (item.srcSet ?? undefined)}
          sizes={isYouTube ? undefined : sizes}
          alt=""
          width={item.width}
          height={item.height}
          loading="lazy"
          decoding="async"
          draggable={false}
          onLoad={() => setLoaded(true)}
          className="absolute inset-0 h-full w-full object-contain transition-[filter] duration-300 group-hover:brightness-110"
        />
      )}

      {item.type !== "image" && (
        <span
          aria-hidden
          className="pointer-events-none absolute bottom-2 left-2 inline-flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-[0.7rem] font-semibold tracking-wide text-white backdrop-blur-sm"
        >
          <PlayIcon />
          {isYouTube ? "YouTube" : duration}
        </span>
      )}
    </button>
  );
}
