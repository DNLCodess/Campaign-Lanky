"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { youTubeEmbed } from "@/lib/gallery/youtube";
import type { PublicItem } from "@/lib/gallery/types";

/**
 * One full-screen slide. Rendered only for the current item (keyed by id), so
 * a video or YouTube player unmounts — and stops — as soon as the viewer moves on.
 * The parent stage is a size container; media fits it whole (`contain`).
 */
export function LightboxSlide({ item, label }: { item: PublicItem; label: string }) {
  if (item.type === "youtube" && item.youtubeId) return <YouTubeSlide item={item} label={label} />;
  if (item.type === "video" && item.videoUrl) return <VideoSlide item={item} label={label} />;
  return <ImageSlide item={item} label={label} />;
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

function VideoSlide({ item, label }: { item: PublicItem; label: string }) {
  const ref = useRef<HTMLVideoElement>(null);

  // Opening / navigating here was a user gesture, so playback with sound is
  // allowed. If the browser still refuses, the controls are there to start it.
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.play().catch(() => {});
    return () => v.pause();
  }, []);

  return (
    <video
      ref={ref}
      src={item.videoUrl ?? undefined}
      poster={item.src ?? undefined}
      controls
      playsInline
      preload="metadata"
      aria-label={label}
      data-lightbox-video=""
      className="absolute inset-0 h-full w-full object-contain"
    />
  );
}

function YouTubeSlide({ item, label }: { item: PublicItem; label: string }) {
  const short = item.width < item.height;
  // Fit a fixed 16:9 (or 9:16 Short) box inside the stage using container units.
  const style = short
    ? { width: "min(100cqw, calc(100cqh * 9 / 16))", height: "min(100cqh, calc(100cqw * 16 / 9))" }
    : { width: "min(100cqw, calc(100cqh * 16 / 9))", height: "min(100cqh, calc(100cqw * 9 / 16))" };

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <iframe
        src={youTubeEmbed(item.youtubeId!)}
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
