"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { srcSetUrl } from "@/lib/gallery/feed";
import { youTubeEmbed } from "@/lib/gallery/youtube";
import type { PublicItem } from "@/lib/gallery/types";

/**
 * One full-screen slide. Rendered only for the current item (keyed by id), so
 * a video or YouTube player unmounts — and stops — as soon as the viewer moves on.
 * The parent stage is a size container; media fits it whole (`contain`).
 */
export function LightboxSlide({
  item,
  label,
  autoPlay = false,
}: {
  item: PublicItem;
  label: string;
  /** True only for the item the user tapped to open the viewer, on that first showing. */
  autoPlay?: boolean;
}) {
  if (item.type === "youtube") return <YouTubeSlide item={item} label={label} autoPlay={autoPlay} />;
  if (item.type === "video" && item.videoUrl) return <VideoSlide item={item} label={label} autoPlay={autoPlay} />;
  return <ImageSlide item={item} label={label} />;
}

function Unplayable() {
  return (
    <p className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-white/70">
      This video can&apos;t be played.
    </p>
  );
}

function ImageSlide({ item, label }: { item: PublicItem; label: string }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  // Cached images can finish before React attaches onLoad.
  const imgRef = useCallback((img: HTMLImageElement | null) => {
    if (img?.complete && img.naturalWidth > 0) setLoaded(true);
  }, []);

  if (!item.src || failed) {
    return (
      <p className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-white/70">
        This photo couldn&apos;t be loaded.
      </p>
    );
  }

  return (
    <>
      {item.blur && !loaded && (
        // eslint-disable-next-line @next/next/no-img-element -- inline blur data URL placeholder
        <img
          src={item.blur}
          alt=""
          aria-hidden
          draggable={false}
          className="absolute inset-0 h-full w-full object-contain blur-xl"
        />
      )}
      {!loaded && (
        <span
          aria-hidden
          className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 animate-spin rounded-full border-2 border-white/70 border-t-transparent"
        />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element -- variants are pre-generated; srcset served straight from storage */}
      <img
        ref={imgRef}
        src={item.src}
        srcSet={item.srcSet ?? undefined}
        sizes="100vw"
        alt={label}
        width={item.width}
        height={item.height}
        decoding="async"
        draggable={false}
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        className={`absolute inset-0 h-full w-full select-none object-contain transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
      />
    </>
  );
}

type MediaSlideProps = { item: PublicItem; label: string; autoPlay: boolean };

function VideoSlide({ item, label, autoPlay }: MediaSlideProps) {
  const ref = useRef<HTMLVideoElement>(null);
  // Read once at mount: a later prop change must never start playback.
  const [startPlaying] = useState(autoPlay);
  // 1280 is plenty for a poster frame; fall back to the largest variant.
  const poster = srcSetUrl(item.srcSet, 1280) ?? item.src ?? undefined;

  // Tapping this very video to open the viewer was the user's gesture, so it may
  // start with sound. Slides reached by arrows/swipes stay paused with controls.
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (startPlaying) v.play().catch(() => {});
    return () => v.pause();
  }, [startPlaying]);

  return (
    <video
      ref={ref}
      src={item.videoUrl ?? undefined}
      poster={poster}
      controls
      playsInline
      preload="metadata"
      aria-label={label}
      data-lightbox-video=""
      className="absolute inset-0 h-full w-full object-contain"
    />
  );
}

function YouTubeSlide({ item, label, autoPlay }: MediaSlideProps) {
  const [startPlaying] = useState(autoPlay);
  const src = item.youtubeId ? youTubeEmbed(item.youtubeId, startPlaying) : null;
  if (!src) return <Unplayable />;
  const short = item.width < item.height;
  // Fit a fixed 16:9 (or 9:16 Short) box inside the stage using container units.
  const style = short
    ? { width: "min(100cqw, calc(100cqh * 9 / 16))", height: "min(100cqh, calc(100cqw * 16 / 9))" }
    : { width: "min(100cqw, calc(100cqh * 16 / 9))", height: "min(100cqh, calc(100cqw * 9 / 16))" };

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <iframe
        src={src}
        title={label}
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        className="block border-0 bg-black"
        style={style}
      />
    </div>
  );
}
