// Pure, DOM-free helpers for the admin gallery uploader. Safe to import from
// client components and from node:test.

export const MAX_UPLOAD_BYTES = 52428800; // 50 MB — matches ops.ts and the bucket limit
export const CAPTION_MAX = 1000;
export const MAX_CONCURRENT_UPLOADS = 3;
export const MAX_CONCURRENT_FINALIZES = 2;

export const VIDEO_SIZE_COPY =
  "Clips up to about 30–40 seconds (50 MB). For longer videos, upload to YouTube and paste the link.";
export const VIDEO_LOCATION_NOTE = "Video files can contain the location they were recorded at.";
export const MOV_NOTICE =
  "iPhone videos may not play on some older Android phones. For anything important, YouTube is safer.";
export const UNSUPPORTED_FILE =
  "That file type isn't supported. Use JPEG, PNG, WebP or HEIC photos, or MP4, MOV or WebM videos.";
export const BAD_YOUTUBE = "That doesn't look like a YouTube video link.";

// Server messages (src/lib/gallery/ops.ts / process-image.ts) the client branches on.
// upload-logic.test.ts checks these still appear verbatim in those files.
export const SERVER_MSG = {
  unsupportedPhoto: "Unsupported photo format — export as JPEG and try again.",
  tooLargePhoto: "This photo is too large. Export it at a smaller size and try again.",
  processFailed: "Couldn't process this file. Remove it and try uploading again.",
  uploadMissing: "The upload didn't finish. Remove it and try again.",
} as const;

const EXT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
  mp4: "video/mp4",
  m4v: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
};
const ACCEPTED = new Set(Object.values(EXT_TYPES));

export type FileLike = { name: string; type: string; size: number };
export type Classified =
  | { ok: true; kind: "image" | "video"; contentType: string; isMov: boolean }
  | { ok: false; error: string };

/** Decide kind + content type before any request; refuses >50 MB and unknown types. */
export function classifyFile(file: FileLike): Classified {
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false, error: VIDEO_SIZE_COPY };
  if (file.size <= 0) return { ok: false, error: "That file is empty." };
  const ext = file.name.includes(".") ? file.name.split(".").pop()!.toLowerCase() : "";
  // Some browsers report HEIC/MOV with an empty or generic type; fall back to the extension.
  let contentType = (file.type || "").toLowerCase();
  if (!ACCEPTED.has(contentType)) contentType = EXT_TYPES[ext] ?? "";
  if (!contentType) return { ok: false, error: UNSUPPORTED_FILE };
  const kind = contentType.startsWith("video/") ? "video" : "image";
  return { ok: true, kind, contentType, isMov: contentType === "video/quicktime" };
}

/** Runs at most `limit` tasks at once; extra calls wait in FIFO order. */
export function createLimiter(limit: number) {
  let active = 0;
  const waiting: (() => void)[] = [];
  const release = () => {
    active--;
    const next = waiting.shift();
    if (next) next();
  };
  return function run<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const start = () => {
        active++;
        fn().then(resolve, reject).finally(release);
      };
      if (active < limit) start();
      else waiting.push(start);
    });
  };
}

/** Runs tasks strictly one after another (createUpload must be serial). */
export function createSerial() {
  return createLimiter(1);
}

export type Stage = "upload" | "finalize";
export type RetryMode = "reupload" | "refinalize" | "none";

/**
 * What Retry should do for a failed local upload.
 * - upload/prepare failure: signed URLs can't be reused, so remove + fresh upload.
 * - finalize threw (transient/network): call finalize again.
 * - finalize returned an error: unsupported/too-large are final; a missing upload
 *   needs a re-upload; a processing failure may be transient, so finalize again.
 */
export function retryMode(stage: Stage, finalizeError?: string, thrown = false): RetryMode {
  if (stage === "upload") return "reupload";
  if (thrown) return "refinalize";
  if (finalizeError === SERVER_MSG.unsupportedPhoto || finalizeError === SERVER_MSG.tooLargePhoto) return "none";
  if (finalizeError === SERVER_MSG.uploadMissing) return "reupload";
  return "refinalize";
}

/** Retry for a failed item found on the server with no local file (e.g. after reload). */
export function serverRetryMode(error: string | null): "refinalize" | "none" {
  return error === SERVER_MSG.processFailed ? "refinalize" : "none";
}

export function isIsoDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

/** Same ids, same count, no duplicates (order ignored). */
export function sameIdSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  if (set.size !== a.length) return false;
  return b.every((id) => set.has(id)) && new Set(b).size === b.length;
}

/** Move the id at `from` to index `to`; out-of-range moves return a copy unchanged. */
export function moveId(ids: string[], from: number, to: number): string[] {
  const out = [...ids];
  if (from < 0 || from >= out.length || to < 0 || to >= out.length || from === to) return out;
  const [id] = out.splice(from, 1);
  out.splice(to, 0, id);
  return out;
}

export function formatDuration(s: number | null): string | null {
  if (s == null || !Number.isFinite(s)) return null;
  const total = Math.round(s);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}
