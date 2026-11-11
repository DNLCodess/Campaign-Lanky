import "server-only";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { cursorFilter, decodeCursor, encodeCursor, toPublicEntries } from "./feed";
import type { EntryRow, FeedPage, ItemRow, PublicEntry, PublicItem } from "./types";

const BUCKET = "gallery";

export function galleryPublicUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return `${base}/storage/v1/object/public/${BUCKET}/${path}`;
}

async function readyItems(ids: string[]): Promise<ItemRow[]> {
  if (ids.length === 0) return [];
  const supabase = createAdminSupabase();
  const { data, error } = await supabase
    .from("gallery_items")
    .select("*")
    .in("entry_id", ids)
    .eq("processing", "ready")
    .eq("hidden", false)
    .order("position", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ItemRow[];
}

export async function getFeedPage(cursor: string | null, limit = 12): Promise<FeedPage> {
  const empty: FeedPage = { entries: [], nextCursor: null };
  try {
    let decoded = null;
    if (cursor) {
      decoded = decodeCursor(cursor);
      if (!decoded) return empty;
    }
    const supabase = createAdminSupabase();
    let q = supabase.from("gallery_entries").select("*").eq("status", "published");
    if (decoded) q = q.or(cursorFilter(decoded));
    const { data, error } = await q
      .order("taken_on", { ascending: false })
      .order("published_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(limit + 1);
    if (error) throw error;
    const rows = (data ?? []) as EntryRow[];
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const items = await readyItems(page.map((r) => r.id));
    const last = page[page.length - 1];
    const nextCursor =
      hasMore && last && last.published_at
        ? encodeCursor({ takenOn: last.taken_on, publishedAt: last.published_at, id: last.id })
        : null;
    return { entries: toPublicEntries(page, items, galleryPublicUrl), nextCursor };
  } catch {
    return empty;
  }
}

export async function getTeaserEntries(limit = 6): Promise<PublicEntry[]> {
  try {
    const supabase = createAdminSupabase();
    const { data, error } = await supabase
      .from("gallery_entries")
      .select("*")
      .eq("status", "published")
      .order("taken_on", { ascending: false })
      .order("published_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(limit);
    if (error) throw error;
    const rows = (data ?? []) as EntryRow[];
    const items = await readyItems(rows.map((r) => r.id));
    return toPublicEntries(rows, items, galleryPublicUrl).map((e) => {
      const cover = e.items.find((i) => i.id === e.coverItemId) ?? e.items[0];
      return { ...e, items: cover ? [cover] : [] };
    });
  } catch {
    return [];
  }
}

export type AdminEntry = EntryRow & {
  item_count: number;
  failed_count: number;
  cover: PublicItem | null;
};

export async function getAdminEntries(): Promise<AdminEntry[]> {
  try {
    const supabase = createAdminSupabase();
    const { data, error } = await supabase
      .from("gallery_entries")
      .select("*")
      .order("taken_on", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw error;
    const entries = (data ?? []) as EntryRow[];
    if (entries.length === 0) return [];
    const { data: itemData, error: itemErr } = await supabase
      .from("gallery_items")
      .select("*")
      .in("entry_id", entries.map((e) => e.id))
      .order("position", { ascending: true });
    if (itemErr) throw itemErr;
    const items = (itemData ?? []) as ItemRow[];
    const byEntry = new Map<string, ItemRow[]>();
    for (const it of items) {
      const l = byEntry.get(it.entry_id);
      if (l) l.push(it);
      else byEntry.set(it.entry_id, [it]);
    }
    return entries.map((e) => {
      const mine = byEntry.get(e.id) ?? [];
      const coverRow =
        mine.find((i) => i.id === e.cover_item_id && i.processing === "ready") ??
        mine.find((i) => i.processing === "ready") ??
        null;
      const cover = coverRow
        ? (toPublicEntries([e], [{ ...coverRow, hidden: false }], galleryPublicUrl)[0]?.items[0] ?? null)
        : null;
      return {
        ...e,
        item_count: mine.length,
        failed_count: mine.filter((i) => i.processing === "failed").length,
        cover,
      };
    });
  } catch {
    return [];
  }
}

export async function getAdminEntry(
  id: string,
): Promise<{ entry: EntryRow; items: ItemRow[] } | null> {
  try {
    const supabase = createAdminSupabase();
    const { data: entry, error } = await supabase
      .from("gallery_entries")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error || !entry) return null;
    const { data: items, error: itemErr } = await supabase
      .from("gallery_items")
      .select("*")
      .eq("entry_id", id)
      .order("position", { ascending: true });
    if (itemErr) return null;
    return { entry: entry as EntryRow, items: (items ?? []) as ItemRow[] };
  } catch {
    return null;
  }
}
