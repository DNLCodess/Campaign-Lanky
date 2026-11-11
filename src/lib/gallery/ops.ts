// Gallery admin operations: service-role DB + storage work with NO auth and NO
// revalidation. Only ever import this from the "use server" actions file (which
// gates every call with requireAdmin) — or from local scripts with their own
// service-role client. Deliberately free of `server-only` so scripts can load it.
import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { generateSlug } from "../slug";
import { ImageTooLargeError, processImage, UnsupportedImageError } from "./process-image";
import { parseYouTubeUrl } from "./youtube";
import type { EntryKind, EntryRow, ItemRow, Variants } from "./types";

export const PUBLIC_BUCKET = "gallery";
export const ORIGINALS_BUCKET = "gallery-originals";
export const MAX_UPLOAD_BYTES = 52428800;
const VARIANT_WIDTHS = [640, 1280, 2048] as const;

const IMAGE_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
};
const VIDEO_EXT: Record<string, string> = {
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
};

const MSG = {
  noItems: "Add at least one photo or video first.",
  noTitle: "Give the outing a title.",
  tooBig: "That file is over 50 MB. Trim the clip, or post longer videos to YouTube and paste the link.",
  badImageType: "That photo type isn't supported. Use JPEG, PNG, WebP or HEIC.",
  badVideoType: "That video type isn't supported. Use MP4, MOV or WebM.",
  badVideoMeta: "Couldn't read that video's size or length. Try a different file.",
  tooLong: "That video is longer than 10 minutes. Post it to YouTube and paste the link instead.",
  singleFull: "A single holds one photo or video. Remove the current one first, or create an outing.",
  noEntry: "That gallery entry no longer exists.",
  badYouTube: "That doesn't look like a YouTube video link.",
  unsupportedPhoto: "Unsupported photo format — export as JPEG and try again.",
  processFailed: "Couldn't process this file. Remove it and try uploading again.",
  uploadMissing: "The upload didn't finish. Remove it and try again.",
} as const;

type SignedTarget = { signedUrl: string; token: string; path: string; bucket: string };
export type UploadFile = {
  kind: "image" | "video";
  contentType: string;
  size: number;
  width?: number;
  height?: number;
  durationS?: number;
};
export type CreateUploadResult =
  | { itemId: string; upload: SignedTarget; poster?: SignedTarget }
  | { error: string };

// ---------- helpers ----------

async function getEntry(db: SupabaseClient, id: string): Promise<EntryRow | null> {
  const { data, error } = await db.from("gallery_entries").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as EntryRow | null) ?? null;
}

async function getItem(db: SupabaseClient, id: string): Promise<ItemRow | null> {
  const { data, error } = await db.from("gallery_items").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as ItemRow | null) ?? null;
}

async function itemCount(db: SupabaseClient, entryId: string): Promise<number> {
  const { count, error } = await db
    .from("gallery_items")
    .select("id", { count: "exact", head: true })
    .eq("entry_id", entryId);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

async function nextPosition(db: SupabaseClient, entryId: string): Promise<number> {
  const { data, error } = await db
    .from("gallery_items")
    .select("position")
    .eq("entry_id", entryId)
    .order("position", { ascending: false })
    .limit(1);
  if (error) throw new Error(error.message);
  const last = (data ?? [])[0] as { position: number } | undefined;
  return last ? last.position + 1 : 0;
}

/** Set the entry's cover to this item only if it has none (conditional update). */
async function claimCoverIfEmpty(db: SupabaseClient, entryId: string, itemId: string): Promise<void> {
  const { error } = await db
    .from("gallery_entries")
    .update({ cover_item_id: itemId })
    .eq("id", entryId)
    .is("cover_item_id", null);
  if (error) throw new Error(error.message);
}

/** Every storage object an item can own, grouped by bucket. */
function itemObjects(item: ItemRow): { publicPaths: string[]; originalPaths: string[] } {
  const publicPaths: string[] = [];
  const originalPaths: string[] = [];
  if (item.media_type === "youtube") return { publicPaths, originalPaths };
  // Variant paths are deterministic; include all so half-finished processing is cleaned too.
  for (const w of VARIANT_WIDTHS) publicPaths.push(`items/${item.id}/${w}.webp`);
  if (item.storage_path) {
    (item.media_type === "video" ? publicPaths : originalPaths).push(item.storage_path);
  }
  if (item.poster_path) originalPaths.push(item.poster_path);
  return { publicPaths, originalPaths };
}

async function removeObjects(db: SupabaseClient, bucket: string, paths: string[]): Promise<void> {
  for (let i = 0; i < paths.length; i += 1000) {
    const { error } = await db.storage.from(bucket).remove(paths.slice(i, i + 1000));
    if (error) throw new Error(`Storage cleanup failed (${bucket}): ${error.message}`);
  }
}

async function removeItemObjects(db: SupabaseClient, items: ItemRow[]): Promise<void> {
  const publicPaths: string[] = [];
  const originalPaths: string[] = [];
  for (const it of items) {
    const o = itemObjects(it);
    publicPaths.push(...o.publicPaths);
    originalPaths.push(...o.originalPaths);
  }
  await removeObjects(db, PUBLIC_BUCKET, publicPaths);
  await removeObjects(db, ORIGINALS_BUCKET, originalPaths);
}

async function signedTarget(db: SupabaseClient, bucket: string, path: string): Promise<SignedTarget> {
  const { data, error } = await db.storage.from(bucket).createSignedUploadUrl(path);
  if (error || !data) throw new Error(`Couldn't prepare upload: ${error?.message ?? "unknown error"}`);
  return { signedUrl: data.signedUrl, token: data.token, path: data.path, bucket };
}

function isDimension(n: unknown): n is number {
  return typeof n === "number" && Number.isInteger(n) && n >= 1 && n <= 8192;
}

function isIsoDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

function blank(s: string | null | undefined): string | null {
  const t = (s ?? "").trim();
  return t === "" ? null : t;
}

// ---------- entries ----------

export async function createEntryOp(db: SupabaseClient, kind: EntryKind): Promise<string> {
  if (kind !== "outing" && kind !== "single") throw new Error("Unknown entry kind.");
  const slug = `draft-${randomUUID().replace(/-/g, "").slice(0, 12)}`;
  const { data, error } = await db
    .from("gallery_entries")
    .insert({ kind, title: "", slug, status: "draft" })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function updateEntryOp(
  db: SupabaseClient,
  id: string,
  fields: { title: string; body: string | null; place: string | null; takenOn: string },
): Promise<void> {
  const entry = await getEntry(db, id);
  if (!entry) throw new Error(MSG.noEntry);
  if (!isIsoDate(fields.takenOn)) throw new Error("Pick a valid date.");
  const title = (fields.title ?? "").trim();

  let slug = entry.slug;
  if (title) {
    const base = generateSlug(title);
    const { data: clash, error } = await db
      .from("gallery_entries")
      .select("id")
      .eq("slug", base)
      .neq("id", id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!clash) slug = base;
    // Keep an earlier suffixed slug for the same title instead of churning it on every save.
    else if (!new RegExp(`^${base}-[a-z0-9]{8}$`).test(entry.slug)) {
      slug = `${base}-${Date.now().toString(36)}`;
    }
  } else if (entry.kind === "single") {
    slug = `moment-${id.slice(0, 8)}`;
  }

  const row = {
    title,
    body: blank(fields.body),
    place: blank(fields.place),
    taken_on: fields.takenOn,
    slug,
  };
  let { error } = await db.from("gallery_entries").update(row).eq("id", id);
  if (error?.code === "23505") {
    // Lost a race for the slug — suffix and retry once.
    ({ error } = await db
      .from("gallery_entries")
      .update({ ...row, slug: `${slug}-${Date.now().toString(36)}` })
      .eq("id", id));
  }
  if (error) throw new Error(error.message);
}

export async function setEntryStatusOp(
  db: SupabaseClient,
  id: string,
  status: "draft" | "published",
): Promise<{ error?: string }> {
  if (status !== "draft" && status !== "published") return { error: "Unknown status." };
  const entry = await getEntry(db, id);
  if (!entry) return { error: MSG.noEntry };

  if (status === "draft") {
    const { error } = await db.from("gallery_entries").update({ status: "draft" }).eq("id", id);
    if (error) throw new Error(error.message);
    return {};
  }

  const { count, error: countErr } = await db
    .from("gallery_items")
    .select("id", { count: "exact", head: true })
    .eq("entry_id", id)
    .eq("processing", "ready")
    .eq("hidden", false);
  if (countErr) throw new Error(countErr.message);
  if (!count) return { error: MSG.noItems };
  if (entry.kind === "outing" && !entry.title.trim()) return { error: MSG.noTitle };

  // One update: feed cursor pagination needs published_at on every published row.
  const { error } = await db
    .from("gallery_entries")
    .update({
      status: "published",
      ...(entry.published_at ? {} : { published_at: new Date().toISOString() }),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  return {};
}

export async function deleteEntryOp(db: SupabaseClient, id: string): Promise<void> {
  const { data, error } = await db.from("gallery_items").select("*").eq("entry_id", id);
  if (error) throw new Error(error.message);
  await removeItemObjects(db, (data ?? []) as ItemRow[]);
  const { error: delErr } = await db.from("gallery_entries").delete().eq("id", id);
  if (delErr) throw new Error(delErr.message);
}

// ---------- uploads ----------

export async function createUploadOp(
  db: SupabaseClient,
  entryId: string,
  file: UploadFile,
): Promise<CreateUploadResult> {
  if (!file || (file.kind !== "image" && file.kind !== "video")) return { error: "Unknown file kind." };
  if (typeof file.size !== "number" || !(file.size > 0)) return { error: "That file is empty." };
  if (file.size > MAX_UPLOAD_BYTES) return { error: MSG.tooBig };

  const ext = (file.kind === "image" ? IMAGE_EXT : VIDEO_EXT)[file.contentType];
  if (!ext) return { error: file.kind === "image" ? MSG.badImageType : MSG.badVideoType };

  if (file.kind === "video") {
    if (!isDimension(file.width) || !isDimension(file.height)) return { error: MSG.badVideoMeta };
    const d = file.durationS;
    if (typeof d !== "number" || !Number.isFinite(d) || d < 0) return { error: MSG.badVideoMeta };
    if (d > 600) return { error: MSG.tooLong };
  }

  const entry = await getEntry(db, entryId);
  if (!entry) return { error: MSG.noEntry };
  if (entry.kind === "single" && (await itemCount(db, entryId)) > 0) return { error: MSG.singleFull };

  const itemId = randomUUID();
  const isVideo = file.kind === "video";
  const storagePath = isVideo ? `videos/${itemId}.${ext}` : `images/${itemId}.${ext}`;
  const posterPath = isVideo ? `posters/${itemId}.jpg` : null;

  const { error } = await db.from("gallery_items").insert({
    id: itemId,
    entry_id: entryId,
    position: await nextPosition(db, entryId),
    media_type: file.kind,
    storage_path: storagePath,
    poster_path: posterPath,
    width: isVideo ? file.width : isDimension(file.width) ? file.width : 0,
    height: isVideo ? file.height : isDimension(file.height) ? file.height : 0,
    duration_s: isVideo ? file.durationS : null,
    processing: "pending",
  });
  if (error) throw new Error(error.message);

  try {
    const upload = await signedTarget(db, isVideo ? PUBLIC_BUCKET : ORIGINALS_BUCKET, storagePath);
    const poster = posterPath ? await signedTarget(db, ORIGINALS_BUCKET, posterPath) : undefined;
    return poster ? { itemId, upload, poster } : { itemId, upload };
  } catch (err) {
    await db.from("gallery_items").delete().eq("id", itemId);
    throw err;
  }
}

export async function finalizeItemOp(db: SupabaseClient, itemId: string): Promise<{ error?: string }> {
  const item = await getItem(db, itemId);
  if (!item) return { error: "That item no longer exists." };
  if (item.media_type === "youtube") return {};

  const fail = async (message: string) => {
    const { error } = await db
      .from("gallery_items")
      .update({ processing: "failed", error: message })
      .eq("id", itemId);
    if (error) throw new Error(error.message);
    return { error: message };
  };

  const sourcePath = item.media_type === "video" ? item.poster_path : item.storage_path;
  if (!sourcePath) return fail(MSG.processFailed);

  if (item.media_type === "video" && item.storage_path) {
    const { data: exists } = await db.storage.from(PUBLIC_BUCKET).exists(item.storage_path);
    if (!exists) return fail(MSG.uploadMissing);
  }

  let processed;
  try {
    const { data: blob, error } = await db.storage.from(ORIGINALS_BUCKET).download(sourcePath);
    if (error || !blob) return fail(MSG.uploadMissing);
    processed = await processImage(Buffer.from(await blob.arrayBuffer()));
  } catch (err) {
    if (err instanceof ImageTooLargeError) return fail(err.message);
    if (err instanceof UnsupportedImageError) return fail(MSG.unsupportedPhoto);
    return fail(MSG.processFailed);
  }

  const variants: Variants = {};
  try {
    for (const v of processed.variants) {
      const path = `items/${itemId}/${v.width}.webp`;
      const { error } = await db.storage
        .from(PUBLIC_BUCKET)
        .upload(path, v.data, { contentType: "image/webp", upsert: true, cacheControl: "31536000" });
      if (error) throw new Error(error.message);
      variants[String(v.width) as keyof Variants] = path;
    }
  } catch {
    return fail(MSG.processFailed);
  }

  const update: Partial<ItemRow> = {
    variants,
    blur: processed.blur,
    processing: "ready",
    error: null,
  };
  if (item.media_type === "image") {
    update.width = processed.width;
    update.height = processed.height;
  }
  const { error } = await db.from("gallery_items").update(update).eq("id", itemId);
  if (error) throw new Error(error.message);
  await claimCoverIfEmpty(db, item.entry_id, itemId);
  return {};
}

export async function addYouTubeOp(
  db: SupabaseClient,
  entryId: string,
  url: string,
): Promise<{ error?: string }> {
  const parsed = parseYouTubeUrl(typeof url === "string" ? url : "");
  if (!parsed) return { error: MSG.badYouTube };
  const entry = await getEntry(db, entryId);
  if (!entry) return { error: MSG.noEntry };
  if (entry.kind === "single" && (await itemCount(db, entryId)) > 0) return { error: MSG.singleFull };

  const { data, error } = await db
    .from("gallery_items")
    .insert({
      entry_id: entryId,
      position: await nextPosition(db, entryId),
      media_type: "youtube",
      youtube_id: parsed.id,
      youtube_short: parsed.short,
      width: parsed.short ? 900 : 1600,
      height: parsed.short ? 1600 : 900,
      processing: "ready",
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  await claimCoverIfEmpty(db, entryId, data.id as string);
  return {};
}

// ---------- items ----------

export async function reorderItemsOp(db: SupabaseClient, entryId: string, orderedIds: string[]): Promise<void> {
  const { data, error } = await db.from("gallery_items").select("id").eq("entry_id", entryId);
  if (error) throw new Error(error.message);
  const current = new Set(((data ?? []) as { id: string }[]).map((r) => r.id));
  const unique = new Set(orderedIds);
  if (unique.size !== orderedIds.length || unique.size !== current.size || orderedIds.some((id) => !current.has(id))) {
    throw new Error("The item list changed — reload and try again.");
  }
  const results = await Promise.all(
    orderedIds.map((id, position) =>
      db.from("gallery_items").update({ position }).eq("id", id).eq("entry_id", entryId),
    ),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) throw new Error(failed.error.message);
}

export async function setCoverOp(db: SupabaseClient, entryId: string, itemId: string): Promise<void> {
  const item = await getItem(db, itemId);
  if (!item || item.entry_id !== entryId) throw new Error("That item isn't part of this entry.");
  const { error } = await db.from("gallery_entries").update({ cover_item_id: itemId }).eq("id", entryId);
  if (error) throw new Error(error.message);
}

export async function setItemHiddenOp(db: SupabaseClient, itemId: string, hidden: boolean): Promise<void> {
  const { error } = await db.from("gallery_items").update({ hidden: Boolean(hidden) }).eq("id", itemId);
  if (error) throw new Error(error.message);
}

export async function setItemCaptionOp(db: SupabaseClient, itemId: string, caption: string | null): Promise<void> {
  const value = blank(caption);
  if (value && value.length > 1000) throw new Error("Keep the caption under 1,000 characters.");
  const { error } = await db.from("gallery_items").update({ caption: value }).eq("id", itemId);
  if (error) throw new Error(error.message);
}

export async function removeItemOp(db: SupabaseClient, itemId: string): Promise<void> {
  const item = await getItem(db, itemId);
  if (!item) return;
  await removeItemObjects(db, [item]);
  // FK `on delete set null` clears the cover when this item was it.
  const { error } = await db.from("gallery_items").delete().eq("id", itemId);
  if (error) throw new Error(error.message);

  // Hand the cover to the first remaining ready, visible item.
  const { data: next, error: nextErr } = await db
    .from("gallery_items")
    .select("id")
    .eq("entry_id", item.entry_id)
    .eq("processing", "ready")
    .eq("hidden", false)
    .order("position", { ascending: true })
    .limit(1);
  if (nextErr) throw new Error(nextErr.message);
  const first = (next ?? [])[0] as { id: string } | undefined;
  if (first) await claimCoverIfEmpty(db, item.entry_id, first.id);
}
