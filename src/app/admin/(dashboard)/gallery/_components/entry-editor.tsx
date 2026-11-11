"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { deleteEntry, setEntryStatus, updateEntry } from "@/app/admin/(dashboard)/gallery/actions";
import type { AdminEntryView, AdminItemView } from "./admin-view";
import { ItemGrid } from "./item-grid";
import { MediaUploader, useUploadManager } from "./media-uploader";
import { isIsoDate, MOV_NOTICE } from "./upload-logic";

const POLL_MS = 4000;
const MAX_POLLS = 45; // ~3 minutes, so an abandoned pending item can't poll forever

type Fields = { title: string; body: string; place: string; takenOn: string };

const input =
  "w-full rounded-brand border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-muted/50 focus:border-accent focus:outline-none";
const ghostBtn =
  "rounded-brand border border-border px-4 py-2 text-sm text-text-muted transition-colors hover:border-accent hover:text-text disabled:opacity-50";
const primaryBtn =
  "rounded-brand bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-50";

export function EntryEditor({ entry, items }: { entry: AdminEntryView; items: AdminItemView[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const isOuting = entry.kind === "outing";
  const noun = isOuting ? "outing" : "single";

  const initial: Fields = {
    title: entry.title,
    body: entry.body ?? "",
    place: entry.place ?? "",
    takenOn: entry.taken_on,
  };
  const [fields, setFields] = useState<Fields>(initial);
  const [saved, setSaved] = useState<Fields>(initial);
  const [saving, setSaving] = useState(false);
  const [savedNote, setSavedNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusBusy, setStatusBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const refresh = useCallback(() => startTransition(() => router.refresh()), [router]);
  const uploads = useUploadManager(entry.id, refresh);
  const { tasks, settle } = uploads;

  const dirty =
    fields.title !== saved.title ||
    fields.body !== saved.body ||
    fields.place !== saved.place ||
    fields.takenOn !== saved.takenOn;

  const set = (k: keyof Fields) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFields((f) => ({ ...f, [k]: e.target.value }));
    setSavedNote(null);
  };

  const save = async (): Promise<boolean> => {
    setError(null);
    if (!dirty) return true;
    if (!isIsoDate(fields.takenOn)) {
      setError("Pick a valid date.");
      return false;
    }
    const snapshot = fields;
    setSaving(true);
    try {
      await updateEntry(entry.id, {
        title: snapshot.title,
        body: isOuting ? snapshot.body : null,
        place: isOuting ? snapshot.place : null,
        takenOn: snapshot.takenOn,
      });
      setSaved(snapshot);
      setSavedNote("Saved");
      refresh();
      return true;
    } catch {
      setError("Couldn't save. Check your connection and try again.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (status: "draft" | "published") => {
    if (!(await save())) return;
    setStatusBusy(true);
    try {
      const res = await setEntryStatus(entry.id, status);
      if (res.error) setError(res.error);
      refresh();
    } catch {
      setError("Couldn't update the status. Check your connection and try again.");
    } finally {
      setStatusBusy(false);
    }
  };

  const remove = async () => {
    setDeleting(true);
    setError(null);
    try {
      await deleteEntry(entry.id);
    } catch {
      setError(`Couldn't delete this ${noun}. Check your connection and try again.`);
      setDeleting(false);
      return;
    }
    router.push("/admin/gallery");
  };

  // Drop finished uploads once the refreshed server data shows them ready.
  useEffect(() => {
    settle(new Set(items.filter((i) => i.processing === "ready").map((i) => i.id)));
  }, [items, settle]);

  // Poll while an item is pending that this tab isn't driving (e.g. uploaded from a phone).
  const tracked = new Set(tasks.map((t) => t.itemId).filter(Boolean));
  const untrackedPending = items.some((i) => i.processing === "pending" && !tracked.has(i.id));
  useEffect(() => {
    if (!untrackedPending) return;
    let polls = 0;
    const timer = setInterval(() => {
      if (++polls > MAX_POLLS) clearInterval(timer);
      else refresh();
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [untrackedPending, refresh]);

  const published = entry.status === "published";
  const visibleCount = items.filter((i) => i.processing === "ready" && !i.hidden).length;
  const singleFull =
    !isOuting && (items.length > 0 || tasks.some((t) => t.status !== "failed" || t.itemId));
  const busy = saving || statusBusy || deleting;

  return (
    <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
      <div className="border-b border-border/60 pb-5">
        <Link href="/admin/gallery" className="text-sm text-text-muted/60 hover:text-text-muted">
          ← Gallery
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="font-heading text-2xl text-text">{isOuting ? "Outing" : "Single"}</h1>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
              published ? "bg-green-500/15 text-green-300" : "bg-white/10 text-text-muted"
            }`}
          >
            {published ? "Published" : "Draft"}
          </span>
          {published && (
            <a
              href={isOuting ? `/gallery#${entry.slug}` : "/gallery"}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-accent hover:text-accent-hover"
            >
              View ↗
            </a>
          )}
        </div>
        {published && visibleCount === 0 && (
          <p className="mt-3 rounded-brand border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-sm text-amber-200">
            Not visible: no visible items. Add media or show a hidden item so this {noun} appears in the gallery.
          </p>
        )}
        {published && (
          <p className="mt-3 text-xs text-text-muted">
            This {noun} is live: text edits and new media appear publicly as soon as they save.
          </p>
        )}
      </div>

      <section className="mt-6 grid gap-4 sm:grid-cols-2">
        <Field label={isOuting ? "Title" : "Caption"} full={!isOuting}>
          {isOuting ? (
            <input value={fields.title} onChange={set("title")} onBlur={() => void save()} className={input} placeholder="e.g. Bodija Market visit" />
          ) : (
            <textarea value={fields.title} onChange={set("title")} onBlur={() => void save()} rows={2} className={input} placeholder="Optional caption" />
          )}
        </Field>
        <Field label="Date">
          <input type="date" value={fields.takenOn} onChange={set("takenOn")} onBlur={() => void save()} className={input} />
        </Field>
        {isOuting && (
          <>
            <Field label="Place">
              <input value={fields.place} onChange={set("place")} onBlur={() => void save()} className={input} placeholder="e.g. Bodija Market, Ibadan North" />
            </Field>
            <Field label="Short text" full>
              <textarea value={fields.body} onChange={set("body")} onBlur={() => void save()} rows={3} className={input} placeholder="A sentence or two about the outing (optional)" />
            </Field>
          </>
        )}
      </section>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button type="button" disabled={busy} onClick={() => void save()} className={ghostBtn}>
          {saving ? "Saving…" : published ? "Save" : "Save draft"}
        </button>
        {published ? (
          <button type="button" disabled={busy} onClick={() => void changeStatus("draft")} className={ghostBtn}>
            Unpublish
          </button>
        ) : (
          <button type="button" disabled={busy} onClick={() => void changeStatus("published")} className={primaryBtn}>
            {statusBusy ? "Publishing…" : "Publish"}
          </button>
        )}
        <span className="text-xs text-text-muted">{dirty ? "Unsaved changes" : savedNote}</span>
        <button
          type="button"
          disabled={busy}
          onClick={() => setConfirmDelete(true)}
          className="ml-auto rounded-brand px-3 py-2 text-sm text-red-300 transition-colors hover:bg-red-500/10"
        >
          Delete
        </button>
      </div>

      {confirmDelete && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-brand border border-red-500/40 bg-red-500/10 px-3 py-2">
          <p className="text-sm text-text">Delete this {noun} and all its media?</p>
          <button
            type="button"
            disabled={deleting}
            onClick={() => void remove()}
            className="rounded-brand bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-500 disabled:opacity-50"
          >
            {deleting ? "Deleting…" : "Yes, delete"}
          </button>
          <button type="button" disabled={deleting} onClick={() => setConfirmDelete(false)} className={ghostBtn}>
            Cancel
          </button>
        </div>
      )}

      {error && <p className="mt-3 text-sm text-red-300">{error}</p>}

      <h2 className="mt-8 mb-3 font-heading text-lg text-text">Media</h2>
      {!singleFull && (
        <div className="mb-5">
          <MediaUploader
            entryId={entry.id}
            single={!isOuting}
            onFiles={uploads.addFiles}
            onChanged={refresh}
          />
        </div>
      )}
      {uploads.movSeen && <p className="mb-4 text-sm text-amber-300">{MOV_NOTICE}</p>}
      <ItemGrid
        entryId={entry.id}
        isOuting={isOuting}
        coverId={entry.cover_item_id}
        items={items}
        tasks={tasks}
        onRetryTask={uploads.retry}
        onDismissTask={(key) => void uploads.dismiss(key)}
        onChanged={refresh}
      />
    </div>
  );
}

function Field({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return (
    <label className={`block ${full ? "sm:col-span-2" : ""}`}>
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-muted">{label}</span>
      {children}
    </label>
  );
}
