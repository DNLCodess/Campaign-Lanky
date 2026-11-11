"use client";

import { useRef, useState } from "react";
import {
  removeItem,
  reorderItems,
  setCover,
  setItemCaption,
  setItemHidden,
} from "@/app/admin/(dashboard)/gallery/actions";
import type { AdminItemView } from "./admin-view";
import type { UploadTask } from "./media-uploader";
import { requestFinalize } from "./upload-xhr";
import { CAPTION_MAX, formatDuration, moveId, sameIdSet, serverRetryMode } from "./upload-logic";

const NETWORK = "Something went wrong. Check your connection and try again.";

type Props = {
  entryId: string;
  isOuting: boolean;
  coverId: string | null;
  items: AdminItemView[];
  tasks: UploadTask[];
  onRetryTask: (key: string) => void;
  onDismissTask: (key: string) => void;
  onChanged: () => void;
};

export function ItemGrid({ entryId, isOuting, coverId, items, tasks, onRetryTask, onDismissTask, onChanged }: Props) {
  const serverIds = items.map((i) => i.id);
  const base = serverIds.join(",");
  const [localOrder, setLocalOrder] = useState<{ base: string; ids: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dragFrom = useRef<number | null>(null);

  const orderedIds = localOrder && localOrder.base === base ? localOrder.ids : serverIds;
  const byId = new Map(items.map((i) => [i.id, i]));
  const ordered = orderedIds.map((id) => byId.get(id)).filter((x): x is AdminItemView => !!x);
  const taskFor = new Map(tasks.filter((t) => t.itemId).map((t) => [t.itemId!, t]));
  const orphanTasks = tasks.filter((t) => !t.itemId || !byId.has(t.itemId));
  // Reorder only when the client knows every item the server has (reorderItems requires the exact set).
  const canReorder = items.length > 1 && orphanTasks.every((t) => !t.itemId);

  const reorder = async (ids: string[]) => {
    setError(null);
    if (!canReorder || !sameIdSet(ids, serverIds)) {
      setError("The item list changed — wait for uploads to finish, then try again.");
      return;
    }
    setLocalOrder({ base, ids });
    try {
      await reorderItems(entryId, ids);
    } catch {
      setLocalOrder(null);
      setError("Couldn't save the new order. Reload the page and try again.");
    }
    onChanged();
  };

  const act = async (fn: () => Promise<unknown>) => {
    setError(null);
    try {
      await fn();
    } catch {
      setError(NETWORK);
    }
    onChanged();
  };

  if (ordered.length === 0 && orphanTasks.length === 0) {
    return <p className="text-sm text-text-muted">No media yet.</p>;
  }

  return (
    <div>
      {error && <p role="alert" className="mb-3 text-sm text-red-300">{error}</p>}
      {canReorder && <p className="mb-3 text-xs text-text-muted">Drag to reorder, or use the arrows.</p>}
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {ordered.map((item, index) => (
          <li
            key={item.id}
            draggable={canReorder}
            onDragStart={(e) => {
              dragFrom.current = index;
              e.dataTransfer.effectAllowed = "move";
              e.dataTransfer.setData("text/plain", item.id);
            }}
            onDragOver={(e) => {
              if (dragFrom.current !== null) e.preventDefault();
            }}
            onDrop={(e) => {
              e.preventDefault();
              const from = dragFrom.current;
              dragFrom.current = null;
              if (from !== null && from !== index) void reorder(moveId(orderedIds, from, index));
            }}
            onDragEnd={() => {
              dragFrom.current = null;
            }}
          >
            <ItemCard
              item={item}
              task={taskFor.get(item.id)}
              isOuting={isOuting}
              isCover={coverId === item.id}
              onMove={
                canReorder
                  ? (dir) => void reorder(moveId(orderedIds, index, index + dir))
                  : undefined
              }
              first={index === 0}
              last={index === ordered.length - 1}
              act={act}
              entryId={entryId}
              onRetryTask={onRetryTask}
              onDismissTask={onDismissTask}
            />
          </li>
        ))}
        {orphanTasks.map((t) => (
          <li key={t.key}>
            <Card thumb={t.previewUrl} alt={t.name} hidden={false}>
              <TaskStatus task={t} onRetry={onRetryTask} onDismiss={onDismissTask} />
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Card({
  thumb,
  srcSet,
  alt,
  hidden,
  badge,
  children,
}: {
  thumb: string | null;
  srcSet?: string | null;
  alt: string;
  hidden: boolean;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [broken, setBroken] = useState(false);
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-brand border border-border/60 bg-surface/30">
      {/* Whole media shown at its true ratio (contained), never cropped. */}
      <div className={`relative aspect-[4/3] bg-bg ${hidden ? "opacity-40" : ""}`}>
        {thumb && !broken ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumb}
            srcSet={srcSet ?? undefined}
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            alt={alt}
            loading="lazy"
            onError={() => setBroken(true)}
            className="h-full w-full object-contain"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-text-muted/60">No preview</div>
        )}
        {badge && <div className="absolute left-1.5 top-1.5 flex flex-wrap gap-1">{badge}</div>}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-2.5">{children}</div>
    </div>
  );
}

function TaskStatus({
  task,
  onRetry,
  onDismiss,
}: {
  task: UploadTask;
  onRetry: (key: string) => void;
  onDismiss: (key: string) => void;
}) {
  const pct = Math.round(task.progress * 100);
  const shown = task.status === "processing" || task.status === "ready" ? 100 : pct;
  return (
    <div className="space-y-1.5 text-xs" aria-live="polite">
      <p className="truncate text-text-muted" title={task.name}>{task.name}</p>
      {task.status === "failed" ? (
        <>
          <p role="alert" className="text-red-300">Failed: {task.error}</p>
          <div className="flex gap-2">
            {task.retry !== "none" && (
              <button type="button" onClick={() => onRetry(task.key)} className={btn}>Retry</button>
            )}
            <button type="button" onClick={() => onDismiss(task.key)} className={btn}>Remove</button>
          </div>
        </>
      ) : (
        <>
          <p className="text-text">
            {task.status === "uploading"
              ? `Uploading ${pct}%`
              : task.status === "processing"
                ? "Processing…"
                : task.status === "ready"
                  ? "Ready"
                  : "Preparing…"}
          </p>
          <div
            role="progressbar"
            aria-label={`Upload progress for ${task.name}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={shown}
            className="h-1.5 overflow-hidden rounded-full bg-white/10"
          >
            <div className="h-full bg-accent transition-[width]" style={{ width: `${shown}%` }} />
          </div>
        </>
      )}
    </div>
  );
}

const btn =
  "rounded-brand border border-border px-2 py-1 text-xs text-text-muted transition-colors hover:border-accent hover:text-text disabled:opacity-40";

function ItemCard({
  item,
  task,
  isOuting,
  isCover,
  onMove,
  first,
  last,
  act,
  entryId,
  onRetryTask,
  onDismissTask,
}: {
  item: AdminItemView;
  task: UploadTask | undefined;
  isOuting: boolean;
  isCover: boolean;
  onMove?: (dir: -1 | 1) => void;
  first: boolean;
  last: boolean;
  act: (fn: () => Promise<unknown>) => Promise<void>;
  entryId: string;
  onRetryTask: (key: string) => void;
  onDismissTask: (key: string) => void;
}) {
  const [caption, setCaption] = useState(item.caption ?? "");
  const [savedCaption, setSavedCaption] = useState(item.caption ?? "");
  const [captionError, setCaptionError] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const ready = item.processing === "ready";
  const duration = formatDuration(item.durationS);
  const showTask = task && task.status !== "ready";

  const saveCaption = async () => {
    if (caption === savedCaption) return;
    if (caption.trim().length > CAPTION_MAX) {
      setCaptionError("Keep the caption under 1,000 characters.");
      return;
    }
    setCaptionError(null);
    try {
      await setItemCaption(item.id, caption.trim() || null);
      setSavedCaption(caption);
    } catch {
      setCaptionError(NETWORK);
    }
  };

  const badge = (
    <>
      {isCover && <span className="rounded bg-primary px-1.5 py-0.5 text-[10px] font-medium text-white">Cover</span>}
      {item.hidden && <span className="rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white">Hidden</span>}
      {item.type !== "image" && (
        <span className="rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white">
          {item.type === "youtube" ? "YouTube" : `▶ ${duration ?? "video"}`}
        </span>
      )}
    </>
  );

  return (
    <Card
      thumb={item.thumb ?? task?.previewUrl ?? null}
      srcSet={item.thumb ? item.thumbSrcSet : null}
      alt={item.caption ?? ""}
      hidden={item.hidden}
      badge={badge}
    >
      {showTask ? (
        <TaskStatus task={task} onRetry={onRetryTask} onDismiss={onDismissTask} />
      ) : item.processing === "pending" ? (
        <p className="text-xs text-text-muted">Processing… (if this never finishes, remove it and upload again)</p>
      ) : item.processing === "failed" ? (
        <div className="space-y-1.5 text-xs">
          <p className="text-red-300">Failed: {item.error ?? "Processing failed."}</p>
          {serverRetryMode(item.error) === "refinalize" && (
            <button
              type="button"
              disabled={retrying}
              onClick={async () => {
                setRetrying(true);
                await act(async () => {
                  const res = await requestFinalize(item.id);
                  if (res.error) throw new Error(res.error);
                });
                setRetrying(false);
              }}
              className={btn}
            >
              {retrying ? "Retrying…" : "Retry"}
            </button>
          )}
        </div>
      ) : null}

      {isOuting && ready && (
        <div>
          <label className="sr-only" htmlFor={`cap-${item.id}`}>Caption</label>
          <input
            id={`cap-${item.id}`}
            value={caption}
            maxLength={CAPTION_MAX}
            onChange={(e) => setCaption(e.target.value)}
            onBlur={() => void saveCaption()}
            placeholder="Caption (optional)"
            className="w-full rounded border border-border bg-bg px-2 py-1 text-xs text-text placeholder:text-text-muted/50 focus:border-accent focus:outline-none"
          />
          {captionError && <p role="alert" className="mt-1 text-xs text-red-300">{captionError}</p>}
        </div>
      )}

      <div className="mt-auto flex flex-wrap gap-1.5">
        {onMove && (
          <>
            <button type="button" aria-label="Move earlier" disabled={first} onClick={() => onMove(-1)} className={btn}>←</button>
            <button type="button" aria-label="Move later" disabled={last} onClick={() => onMove(1)} className={btn}>→</button>
          </>
        )}
        {ready && !isCover && isOuting && (
          <button type="button" onClick={() => void act(() => setCover(entryId, item.id))} className={btn}>
            Set as cover
          </button>
        )}
        {ready && (
          <button type="button" onClick={() => void act(() => setItemHidden(item.id, !item.hidden))} className={btn}>
            {item.hidden ? "Show" : "Hide"}
          </button>
        )}
        {!showTask &&
          (confirmRemove ? (
            <>
              <button
                type="button"
                onClick={() => void act(() => removeItem(item.id))}
                className="rounded-brand bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-500"
              >
                Yes, remove
              </button>
              <button type="button" onClick={() => setConfirmRemove(false)} className={btn}>Cancel</button>
            </>
          ) : (
            <button type="button" onClick={() => setConfirmRemove(true)} className={btn}>Remove</button>
          ))}
      </div>
    </Card>
  );
}
