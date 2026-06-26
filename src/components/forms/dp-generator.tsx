"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { submitDpSupporter } from "@/app/actions";

/** Output canvas size — a standard square social DP. */
const SIZE = 1080;
const FRAME_SRC = "/dp-frame.png";

/**
 * Frame geometry as fractions of {@link SIZE}, measured from the artwork:
 * the photo shows through a circular hole; the name sits on the green plate.
 */
const CIRCLE = { cx: 0.511, cy: 0.494, r: 0.225 };
// The green plate is ~0.192 wide × ~0.115 tall. Keep text inside its rounded
// ends (maxW) and within its height (maxH, the total budget for 1–2 lines).
const PLATE = { cx: 0.5, cy: 0.714, maxW: 0.16, maxH: 0.105 };

type Phase = "upload" | "edit";

export function DpGenerator() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<HTMLImageElement | null>(null);
  const photoRef = useRef<HTMLImageElement | null>(null);

  const [phase, setPhase] = useState<Phase>("upload");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [zoom, setZoom] = useState(1);
  const [frameReady, setFrameReady] = useState(false);
  const offset = useRef({ x: 0, y: 0 });

  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [downloading, setDownloading] = useState(false);

  /** Clamp the pan so the photo always fully covers the circular hole. */
  const clampOffset = useCallback(() => {
    const photo = photoRef.current;
    if (!photo) return;
    const R = CIRCLE.r * SIZE;
    const base = Math.max((2 * R) / photo.width, (2 * R) / photo.height);
    const scale = base * zoom;
    const dw = photo.width * scale;
    const dh = photo.height * scale;
    const maxX = Math.max(0, dw / 2 - R);
    const maxY = Math.max(0, dh / 2 - R);
    offset.current.x = Math.max(-maxX, Math.min(maxX, offset.current.x));
    offset.current.y = Math.max(-maxY, Math.min(maxY, offset.current.y));
  }, [zoom]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, SIZE, SIZE);

    // 1) Photo behind — cover-fit into the circle, positioned by zoom + pan.
    const photo = photoRef.current;
    if (photo) {
      clampOffset();
      const cx = CIRCLE.cx * SIZE;
      const cy = CIRCLE.cy * SIZE;
      const R = CIRCLE.r * SIZE;
      const base = Math.max((2 * R) / photo.width, (2 * R) / photo.height);
      const scale = base * zoom;
      const dw = photo.width * scale;
      const dh = photo.height * scale;
      ctx.drawImage(
        photo,
        cx - dw / 2 + offset.current.x,
        cy - dh / 2 + offset.current.y,
        dw,
        dh,
      );
    }

    // 2) Frame on top — opaque everywhere except the photo hole.
    const frame = frameRef.current;
    if (frame) ctx.drawImage(frame, 0, 0, SIZE, SIZE);

    // 3) Supporter name on the green plate, auto-sized to fit. Long names wrap
    //    to two balanced lines so they stay legible instead of shrinking away.
    const text = name.trim().toUpperCase();
    if (text) {
      const maxW = PLATE.maxW * SIZE;
      const maxH = PLATE.maxH * SIZE;

      // Largest font (px) at which all lines fit the plate's width and height.
      const fitFont = (lines: string[]) => {
        for (let fs = Math.floor(0.07 * SIZE); fs > 8; fs -= 1) {
          ctx.font = `700 ${fs}px Arial, Helvetica, sans-serif`;
          const lineGap = fs * 1.12;
          if (
            lines.length * lineGap <= maxH &&
            lines.every((l) => ctx.measureText(l).width <= maxW)
          ) {
            return fs;
          }
        }
        return 8;
      };

      // Candidate layouts: one line, plus a balanced two-line split (unless the
      // trailing word is just an initial, which looks odd stacked alone).
      const words = text.split(/\s+/);
      const layouts: string[][] = [[text]];
      if (words.length >= 2 && words[words.length - 1].length > 2) {
        let split = 1;
        let bestDiff = Infinity;
        for (let i = 1; i < words.length; i++) {
          const diff = Math.abs(
            words.slice(0, i).join(" ").length - words.slice(i).join(" ").length,
          );
          if (diff < bestDiff) {
            bestDiff = diff;
            split = i;
          }
        }
        layouts.push([
          words.slice(0, split).join(" "),
          words.slice(split).join(" "),
        ]);
      }

      // Prefer whichever layout renders larger (two lines only when it helps).
      let lines = layouts[0];
      let fs = fitFont(layouts[0]);
      for (let i = 1; i < layouts.length; i++) {
        const f = fitFont(layouts[i]);
        if (f > fs) {
          fs = f;
          lines = layouts[i];
        }
      }

      ctx.font = `700 ${fs}px Arial, Helvetica, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#ffffff";
      const lineGap = fs * 1.12;
      const startY = PLATE.cy * SIZE - ((lines.length - 1) * lineGap) / 2;
      lines.forEach((l, i) => {
        ctx.fillText(l, PLATE.cx * SIZE, startY + i * lineGap, maxW);
      });
    }
  }, [name, zoom, clampOffset]);

  // Preload the campaign frame once; flag readiness to trigger a redraw.
  useEffect(() => {
    const img = new Image();
    img.src = FRAME_SRC;
    img.onload = () => {
      frameRef.current = img;
      setFrameReady(true);
    };
  }, []);

  useEffect(() => {
    draw();
  }, [draw, frameReady]);

  function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    setError(null);
    const img = new Image();
    img.onload = () => {
      photoRef.current = img;
      offset.current = { x: 0, y: 0 };
      setZoom(1);
      setPhase("edit");
      setSaved(false);
      draw();
    };
    img.src = URL.createObjectURL(file);
  }

  // --- Drag to reposition the photo within the circle ---
  const dragging = useRef<{ x: number; y: number } | null>(null);
  function onPointerDown(e: ReactPointerEvent<HTMLCanvasElement>) {
    if (!photoRef.current) return;
    dragging.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: ReactPointerEvent<HTMLCanvasElement>) {
    if (!dragging.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const k = SIZE / rect.width; // displayed px -> canvas px
    offset.current.x += (e.clientX - dragging.current.x) * k;
    offset.current.y += (e.clientY - dragging.current.y) * k;
    dragging.current = { x: e.clientX, y: e.clientY };
    draw();
  }
  function onPointerUp(e: ReactPointerEvent<HTMLCanvasElement>) {
    dragging.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
  }

  async function onDownload() {
    if (!photoRef.current) {
      setError("Please upload a photo first.");
      return;
    }
    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }
    if (!email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    setError(null);
    setDownloading(true);
    try {
      // Record the supporter once (don't block the download if it fails).
      if (!saved) {
        const res = await submitDpSupporter({ name: name.trim(), email: email.trim() });
        if (res.status === "success") setSaved(true);
      }
      const canvas = canvasRef.current;
      if (!canvas) return;
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = "i-stand-with-lanky.png";
      a.click();
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)]">
      {/* Preview */}
      <div>
        <div className="relative overflow-hidden rounded-brand border border-border bg-surface/40">
          <canvas
            ref={canvasRef}
            width={SIZE}
            height={SIZE}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            className={`block aspect-square w-full ${
              phase === "edit" ? "cursor-grab active:cursor-grabbing touch-none" : ""
            }`}
          />
          {phase === "upload" && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <p className="rounded-brand bg-bg/80 px-4 py-2 text-sm text-text-muted backdrop-blur-sm">
                Upload a photo to begin
              </p>
            </div>
          )}
        </div>
        {phase === "edit" && (
          <p className="mt-3 text-center text-xs text-text-muted">
            Drag the photo to reposition · use the slider to zoom
          </p>
        )}
      </div>

      {/* Controls */}
      <div className="space-y-5">
        <label className="block">
          <span className="text-sm font-medium text-text">
            Your photo <span className="text-primary">*</span>
          </span>
          <input
            type="file"
            accept="image/*"
            onChange={onFile}
            className="mt-2 block w-full text-sm text-text-muted file:mr-3 file:rounded-brand file:border-0 file:bg-primary file:px-4 file:py-2.5 file:text-sm file:font-medium file:text-white hover:file:bg-primary-hover"
          />
        </label>

        {phase === "edit" && (
          <label className="block">
            <span className="text-sm font-medium text-text">Zoom</span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="mt-2 w-full accent-primary"
            />
          </label>
        )}

        <label className="block">
          <span className="text-sm font-medium text-text">
            Your name <span className="text-primary">*</span>
          </span>
          <input
            type="text"
            value={name}
            maxLength={28}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Adebayo O."
            className="mt-2 w-full rounded-brand border border-border bg-bg px-4 py-3 text-sm text-text focus:border-accent focus:outline-none"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-text">
            Email <span className="text-primary">*</span>
          </span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="mt-2 w-full rounded-brand border border-border bg-bg px-4 py-3 text-sm text-text focus:border-accent focus:outline-none"
          />
        </label>

        <button
          type="button"
          onClick={onDownload}
          disabled={downloading}
          className="w-full rounded-brand bg-primary px-6 py-3.5 text-base font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
        >
          {downloading ? "Preparing…" : "Download my DP"}
        </button>

        {error && <p className="text-sm text-primary">{error}</p>}
        <p className="text-xs leading-relaxed text-text-muted/70">
          Your photo never leaves your device — the image is made right here in your
          browser. We only save your name and email to keep you posted on the
          campaign.
        </p>
      </div>
    </div>
  );
}
