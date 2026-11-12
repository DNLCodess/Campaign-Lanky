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

export async function getFeedPage(
  cursor: string | null,
  limit = 12,
  opts?: { throwOnError?: boolean },
): Promise<FeedPage> {
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
  } catch (err) {
    console.error("[gallery] getFeedPage failed", err);
    // Server-rendered first page degrades to empty; client "load more" rethrows so it can retry.
    if (opts?.throwOnError) throw err;
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
  } catch (err) {
    console.error("[gallery] getTeaserEntries failed", err);
    return [];
  }
}

export type AdminEntry = EntryRow & {
  item_count: number;
  failed_count: number;
  cover: PublicItem | null;
};

const FK = "gallery_items!gallery_items_entry_id_fkey";

type CountRow = { count: number }[] | null;
type AdminEntryRow = EntryRow & { item_count: CountRow; failed: CountRow };

export async function getAdminEntries(): Promise<AdminEntry[]> {
  try {
    const supabase = createAdminSupabase();
    const { data, error } = await supabase
      .from("gallery_entries")
      .select(`*, item_count:${FK}(count), failed:${FK}(count)`)
      .eq("failed.processing", "failed")
      .order("taken_on", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw error;
    const entries = (data ?? []) as unknown as AdminEntryRow[];
    if (entries.length === 0) return [];

    // Cover items: the chosen cover when ready, otherwise the first ready item.
    const coverIds = entries.map((e) => e.cover_item_id).filter((x): x is string => !!x);
    const coverById = new Map<string, ItemRow>();
    for (let i = 0; i < coverIds.length; i += 100) {
      const { data: rows, error: coverErr } = await supabase
        .from("gallery_items")
        .select("*")
        .in("id", coverIds.slice(i, i + 100))
        .eq("processing", "ready");
      if (coverErr) throw coverErr;
      for (const r of (rows ?? []) as ItemRow[]) coverById.set(r.id, r);
    }
    const coverFor = new Map<string, ItemRow>();
    // Task 5 sets cover_item_id when the first item becomes ready, so this fallback should rarely run.
    const needFallback: EntryRow[] = [];
    for (const e of entries) {
      const chosen = e.cover_item_id ? coverById.get(e.cover_item_id) : undefined;
      if (chosen) coverFor.set(e.id, chosen);
      else needFallback.push(e);
    }
    let next = 0;
    const worker = async () => {
      while (next < needFallback.length) {
        const e = needFallback[next++];
        const { data: first, error: firstErr } = await supabase
          .from("gallery_items")
          .select("*")
          .eq("entry_id", e.id)
          .eq("processing", "ready")
          .eq("hidden", false)
          .order("position", { ascending: true })
          .limit(1);
        if (firstErr) throw firstErr;
        const row = (first ?? [])[0] as ItemRow | undefined;
        if (row) coverFor.set(e.id, row);
      }
    };
    await Promise.all(Array.from({ length: Math.min(5, needFallback.length) }, worker));

    return entries.map(({ item_count, failed, ...e }) => {
      const coverRow = coverFor.get(e.id);
      const cover = coverRow
        ? (toPublicEntries([e], [{ ...coverRow, hidden: false }], galleryPublicUrl)[0]?.items[0] ?? null)
        : null;
      return {
        ...e,
        item_count: item_count?.[0]?.count ?? 0,
        failed_count: failed?.[0]?.count ?? 0,
        cover,
      };
    });
  } catch (err) {
    console.error("[gallery] getAdminEntries failed", err);
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
  } catch (err) {
    console.error("[gallery] getAdminEntry failed", err);
    return null;
  }
}
