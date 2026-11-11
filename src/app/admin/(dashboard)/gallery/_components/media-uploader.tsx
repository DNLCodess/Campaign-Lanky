"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  addYouTube,
  createUpload,
  removeItem,
} from "@/app/admin/(dashboard)/gallery/actions";
import { parseYouTubeUrl } from "@/lib/gallery/youtube";
import { requestFinalize, uploadWithProgress } from "./upload-xhr";
import { probeVideo } from "./video-probe";
import {
  BAD_YOUTUBE,
  classifyFile,
  createLimiter,
  createSerial,
  MAX_CONCURRENT_FINALIZES,
  MAX_CONCURRENT_UPLOADS,
  retryMode,
  VIDEO_LOCATION_NOTE,
  VIDEO_SIZE_COPY,
  type RetryMode,
} from "./upload-logic";

export type UploadTask = {
  key: string;
  name: string;
  isMov: boolean;
  previewUrl: string | null;
  itemId: string | null;
  status: "queued" | "preparing" | "uploading" | "processing" | "ready" | "failed";
  progress: number;
  error: string | null;
  retry: RetryMode;
};

type Source = {
  file: File;
  kind: "image" | "video";
  contentType: string;
  probe?: { width: number; height: number; durationS: number; poster: Blob };
};

const START_FAILED = "Couldn't start the upload. Check your connection and retry.";
const UPLOAD_FAILED = "Upload failed. Check your connection and retry.";
const FINALIZE_FAILED = "Processing didn't finish. Check your connection and retry.";

export function isActive(t: UploadTask): boolean {
  return t.status !== "ready" && t.status !== "failed";
}

/** Owns every in-flight upload for one entry. `onChanged` refreshes server data. */
export function useUploadManager(entryId: string, onChanged: () => void) {
  const [tasks, setTasks] = useState<UploadTask[]>([]);
  const [movSeen, setMovSeen] = useState(false);
  const sources = useRef(new Map<string, Source>());
  const itemIds = useRef(new Map<string, string>());
  const [serial] = useState(() => createSerial());
  const [limit] = useState(() => createLimiter(MAX_CONCURRENT_UPLOADS));
  const [finalizeLimit] = useState(() => createLimiter(MAX_CONCURRENT_FINALIZES));
  const counter = useRef(0);
  const inFlight = useRef(new Set<string>()); // keys whose pipeline is running (guards double Retry)
  const urls = useRef(new Set<string>()); // every preview object URL, revoked on drop/unmount
  const tasksRef = useRef<UploadTask[]>([]);
  const seenOnServer = useRef(new Set<string>()); // item ids that have appeared in server data

  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  useEffect(() => {
    const all = urls.current;
    return () => {
      for (const u of all) URL.revokeObjectURL(u);
      all.clear();
    };
  }, []);

  const makeUrl = useCallback((blob: Blob) => {
    const u = URL.createObjectURL(blob);
    urls.current.add(u);
    return u;
  }, []);

  /** Forget tasks: revoke their previews and drop their refs, then remove them from state. */
  const drop = useCallback((keys: Set<string>) => {
    if (keys.size === 0) return;
    for (const t of tasksRef.current) {
      if (!keys.has(t.key)) continue;
      if (t.previewUrl) {
        URL.revokeObjectURL(t.previewUrl);
        urls.current.delete(t.previewUrl);
      }
      sources.current.delete(t.key);
      itemIds.current.delete(t.key);
    }
    setTasks((prev) => prev.filter((t) => !keys.has(t.key)));
  }, []);

  const patch = useCallback((key: string, changes: Partial<UploadTask>) => {
    setTasks((prev) => prev.map((t) => (t.key === key ? { ...t, ...changes } : t)));
  }, []);

  const fail = useCallback(
    (key: string, error: string, retry: RetryMode) => patch(key, { status: "failed", error, retry }),
    [patch],
  );

  const pipeline = useCallback(
    async (key: string, from: "start" | "finalize") => {
      const src = sources.current.get(key);
      if (!src) return;
      patch(key, { status: from === "start" ? "preparing" : "processing", error: null, progress: 0 });

      if (from === "start") {
        if (src.kind === "video" && !src.probe) {
          try {
            src.probe = await probeVideo(src.file);
            patch(key, { previewUrl: makeUrl(src.probe.poster) });
          } catch (err) {
            fail(key, err instanceof Error ? err.message : "Couldn't read that video.", "none");
            return;
          }
        }
        const probe = src.probe;
        let created: Awaited<ReturnType<typeof createUpload>>;
        try {
          // One createUpload at a time: avoids duplicate positions and the single-entry race.
          created = await serial(async () => {
            const stale = itemIds.current.get(key);
            if (stale) {
              // Signed upload URLs can't be reused — drop the old item, then start fresh.
              await removeItem(stale);
              itemIds.current.delete(key);
              patch(key, { itemId: null });
            }
            return createUpload(entryId, {
              kind: src.kind,
              contentType: src.contentType,
              size: src.file.size,
              ...(probe ? { width: probe.width, height: probe.height, durationS: probe.durationS } : {}),
            });
          });
        } catch {
          fail(key, START_FAILED, "reupload");
          return;
        }
        if ("error" in created) {
          fail(key, created.error, "none");
          return;
        }
        itemIds.current.set(key, created.itemId);
        patch(key, { itemId: created.itemId, status: "uploading" });
        onChanged();

        try {
          await limit(async () => {
            const posterSize = created.poster && probe ? probe.poster.size : 0;
            const total = src.file.size + posterSize;
            await uploadWithProgress(created.upload.signedUrl, src.file, src.contentType, (f) =>
              patch(key, { progress: (f * src.file.size) / total }),
            );
            if (created.poster && probe) {
              await uploadWithProgress(created.poster.signedUrl, probe.poster, "image/jpeg", (f) =>
                patch(key, { progress: (src.file.size + f * posterSize) / total }),
              );
            }
          });
        } catch {
          fail(key, UPLOAD_FAILED, "reupload");
          return;
        }
        patch(key, { status: "processing", progress: 1 });
      }

      const itemId = itemIds.current.get(key);
      if (!itemId) {
        fail(key, START_FAILED, "reupload");
        return;
      }
      let result: { error?: string };
      try {
        result = await finalizeLimit(() => requestFinalize(itemId));
      } catch {
        fail(key, FINALIZE_FAILED, retryMode("finalize", undefined, true));
        return;
      }
      if (result.error) {
        fail(key, result.error, retryMode("finalize", result.error));
        onChanged();
        return;
      }
      patch(key, { status: "ready" });
      onChanged();
    },
    [entryId, fail, finalizeLimit, limit, makeUrl, onChanged, patch, serial],
  );

  const run = useCallback(
    async (key: string, from: "start" | "finalize") => {
      if (inFlight.current.has(key)) return;
      inFlight.current.add(key);
      try {
        await pipeline(key, from);
      } finally {
        inFlight.current.delete(key);
      }
    },
    [pipeline],
  );

  const addFiles = useCallback(
    (files: File[]) => {
      const added: UploadTask[] = [];
      const toRun: string[] = [];
      for (const file of files) {
        const key = `u${++counter.current}`;
        const cls = classifyFile(file);
        const base = { key, name: file.name || "file", itemId: null, progress: 0, retry: "none" as RetryMode };
        if (!cls.ok) {
          added.push({ ...base, isMov: false, previewUrl: null, status: "failed", error: cls.error });
          continue;
        }
        sources.current.set(key, { file, kind: cls.kind, contentType: cls.contentType });
        const previewUrl = cls.kind === "image" ? makeUrl(file) : null;
        added.push({ ...base, isMov: cls.isMov, previewUrl, status: "queued", error: null });
        toRun.push(key);
      }
      setTasks((prev) => [...prev, ...added]);
      if (added.some((t) => t.isMov)) setMovSeen(true);
      for (const key of toRun) void run(key, "start");
    },
    [makeUrl, run],
  );

  const retry = useCallback(
    (key: string) => {
      const task = tasksRef.current.find((t) => t.key === key);
      if (!task || task.status !== "failed" || task.retry === "none" || inFlight.current.has(key)) return;
      void run(key, task.retry === "reupload" ? "start" : "finalize");
    },
    [run],
  );

  const dismiss = useCallback(
    async (key: string) => {
      if (inFlight.current.has(key)) return;
      const itemId = itemIds.current.get(key);
      if (itemId) {
        try {
          await removeItem(itemId);
        } catch {
          patch(key, { error: "Couldn't remove it. Check your connection and try again." });
          return;
        }
        onChanged();
      }
      drop(new Set([key]));
    },
    [drop, onChanged, patch],
  );

  /**
   * Reconcile with fresh server data: drop finished tasks once their item shows as
   * ready, and settled (ready/failed) tasks whose item no longer exists on the server
   * (removed elsewhere) so orphan cards can't block reordering.
   */
  const settle = useCallback(
    (serverIds: Set<string>, readyIds: Set<string>) => {
      for (const id of serverIds) seenOnServer.current.add(id);
      const keys = new Set<string>();
      for (const t of tasksRef.current) {
        if (!t.itemId || inFlight.current.has(t.key)) continue;
        if (t.status === "ready" && readyIds.has(t.itemId)) keys.add(t.key);
        // Only once the server has shown the item and it's now gone — not merely "not refreshed yet".
        else if (
          (t.status === "ready" || t.status === "failed") &&
          seenOnServer.current.has(t.itemId) &&
          !serverIds.has(t.itemId)
        ) {
          keys.add(t.key);
        }
      }
      drop(keys);
    },
    [drop],
  );

  const busy = tasks.some(isActive);
  useEffect(() => {
    if (!busy) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [busy]);

  return { tasks, addFiles, retry, dismiss, settle, busy, movSeen };
}

export function MediaUploader({
  entryId,
  single,
  onFiles,
  onChanged,
}: {
  entryId: string;
  single: boolean;
  onFiles: (files: File[]) => void;
  onChanged: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [yt, setYt] = useState("");
  const [ytError, setYtError] = useState<string | null>(null);
  const [ytBusy, setYtBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const take = (list: FileList | null) => {
    if (!list || list.length === 0) return;
    const files = Array.from(list);
    if (single && files.length > 1) setNote("A single holds one photo or video — only the first file was added.");
    else setNote(null);
    onFiles(single ? files.slice(0, 1) : files);
  };

  const submitYouTube = async () => {
    setYtError(null);
    if (!parseYouTubeUrl(yt)) {
      setYtError(BAD_YOUTUBE);
      return;
    }
    setYtBusy(true);
    try {
      const res = await addYouTube(entryId, yt.trim());
      if (res.error) setYtError(res.error);
      else {
        setYt("");
        onChanged();
      }
    } catch {
      setYtError("Couldn't add that link. Check your connection and try again.");
    } finally {
      setYtBusy(false);
    }
  };

  return (
    <section className="rounded-brand border border-border/60 bg-surface/20 p-4 sm:p-5">
      <div
        onDragOver={(e) => {
          if (!e.dataTransfer.types.includes("Files")) return;
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          if (!e.dataTransfer.files.length) return;
          e.preventDefault();
          setDragging(false);
          take(e.dataTransfer.files);
        }}
        className={`flex flex-col items-center gap-3 rounded-brand border-2 border-dashed px-4 py-6 text-center transition-colors ${
          dragging ? "border-accent bg-accent/10" : "border-border/70"
        }`}
      >
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="rounded-brand bg-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
        >
          {single ? "Add photo/video" : "Add photos/videos"}
        </button>
        <p className="hidden text-xs text-text-muted md:block">or drag and drop files here</p>
        <input
          ref={inputRef}
          type="file"
          multiple={!single}
          accept="image/*,video/*"
          className="hidden"
          onChange={(e) => {
            take(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      <div className="mt-3 space-y-1 text-xs text-text-muted">
        <p>{VIDEO_SIZE_COPY}</p>
        <p>{VIDEO_LOCATION_NOTE}</p>
        {note && <p className="text-amber-300">{note}</p>}
      </div>

      <form
        className="mt-4 flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          void submitYouTube();
        }}
      >
        <label className="sr-only" htmlFor="yt-url">Paste YouTube link</label>
        <input
          id="yt-url"
          type="url"
          inputMode="url"
          value={yt}
          onChange={(e) => setYt(e.target.value)}
          placeholder="Paste YouTube link"
          className="min-w-0 flex-1 rounded-brand border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-muted/50 focus:border-accent focus:outline-none"
        />
        <button
          type="submit"
          disabled={ytBusy || !yt.trim()}
          className="rounded-brand border border-border px-4 py-2 text-sm text-text transition-colors hover:border-accent disabled:opacity-50"
        >
          {ytBusy ? "Adding…" : "Add link"}
        </button>
      </form>
      {ytError && <p role="alert" className="mt-2 text-sm text-red-300">{ytError}</p>}
    </section>
  );
}
