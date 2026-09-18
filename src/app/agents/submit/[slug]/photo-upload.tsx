"use client";

import { useRef, useState } from "react";
import { ALLOWED_PHOTO_TYPES, isValidFile } from "@/lib/agents/validation";

const MAX_DIMENSION = 800;
const JPEG_QUALITY = 0.82;

/** Resizes/compresses an image client-side via canvas, returns a JPEG File. */
async function compressImage(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, width, height);

  const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY));
  if (!blob) return file;
  return new File([blob], "photo.jpg", { type: "image/jpeg" });
}

/** Soft, non-blocking check: samples the four corners and warns if they don't look red. */
function checkRedBackground(canvas: HTMLCanvasElement): boolean {
  const ctx = canvas.getContext("2d");
  if (!ctx) return true;
  const { width, height } = canvas;
  const points: [number, number][] = [
    [4, 4],
    [width - 4, 4],
    [4, height - 4],
    [width - 4, height - 4],
  ];
  let redCount = 0;
  for (const [x, y] of points) {
    const [r, g, b] = ctx.getImageData(x, y, 1, 1).data;
    if (r > 110 && r > g + 25 && r > b + 25) redCount++;
  }
  return redCount >= 3;
}

export function PhotoUpload({
  photoFile,
  onPhotoFileChange,
}: {
  photoFile: File | null;
  onPhotoFileChange: (file: File | null) => void;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setWarning(null);
    if (!file || !isValidFile(file, ALLOWED_PHOTO_TYPES)) {
      onPhotoFileChange(null);
      setPreviewUrl(null);
      return;
    }

    const compressed = await compressImage(file);
    onPhotoFileChange(compressed);
    setPreviewUrl(URL.createObjectURL(compressed));

    const bitmap = await createImageBitmap(compressed);
    const canvas = canvasRef.current ?? document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(bitmap, 0, 0);
      if (!checkRedBackground(canvas)) {
        setWarning(
          "Background does not appear red — the Notice requires a red-background photo. You can still submit; an admin will review it.",
        );
      }
    }
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-text">Passport Photograph</label>
      <p className="text-xs text-text-muted">Must have a red background, per the Notice.</p>
      <input
        type="file"
        accept="image/jpeg,image/png"
        onChange={handleFile}
        className="w-full rounded-brand border border-border bg-bg px-3.5 py-2.5 text-sm text-text file:mr-3 file:rounded-brand file:border-0 file:bg-surface-2 file:px-3 file:py-1.5 file:text-sm file:text-text"
      />
      {previewUrl && (
        <div className="relative h-40 w-32 overflow-hidden rounded-brand border border-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt="Photo preview" className="h-full w-full object-cover" />
          <div
            className="pointer-events-none absolute inset-2 rounded border-2 border-dashed border-red-500/70"
            aria-hidden
          />
        </div>
      )}
      {warning && <p className="text-xs text-yellow-600">{warning}</p>}
      {photoFile && !warning && <p className="text-xs text-accent">Photo looks good.</p>}
      <canvas ref={canvasRef} className="hidden" aria-hidden />
    </div>
  );
}
