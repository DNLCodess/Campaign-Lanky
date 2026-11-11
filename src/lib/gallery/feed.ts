import type {
  EntryRow, FeedBlock, FeedCursor, ItemRow, PublicEntry, PublicItem, Variants,
} from "./types";

const WIDTHS = ["640", "1280", "2048"] as const;

function variantProps(variants: Variants | null, publicUrl: (p: string) => string) {
  const present = WIDTHS.filter((w) => variants?.[w]);
  if (!variants || present.length === 0) return { src: null, srcSet: null };
  const srcSet = present.map((w) => `${publicUrl(variants[w]!)} ${w}w`).join(", ");
  return { src: publicUrl(variants[present[present.length - 1]]!), srcSet };
}

function toPublicItem(row: ItemRow, publicUrl: (p: string) => string): PublicItem {
  const isYoutube = row.media_type === "youtube";
  const { src, srcSet } = isYoutube ? { src: null, srcSet: null } : variantProps(row.variants, publicUrl);
  return {
    id: row.id,
    type: row.media_type,
    width: row.width,
    height: row.height,
    blur: row.blur,
    src,
    srcSet,
    videoUrl: row.media_type === "video" && row.storage_path ? publicUrl(row.storage_path) : null,
    durationS: row.duration_s,
    youtubeId: row.youtube_id,
    caption: row.caption,
  };
}

export function toPublicEntries(
  entries: EntryRow[],
  items: ItemRow[],
  publicUrl: (path: string) => string,
): PublicEntry[] {
  const byEntry = new Map<string, ItemRow[]>();
  for (const it of items) {
    if (it.hidden || it.processing !== "ready") continue;
    const list = byEntry.get(it.entry_id);
    if (list) list.push(it);
    else byEntry.set(it.entry_id, [it]);
  }
  const out: PublicEntry[] = [];
  for (const e of entries) {
    const rows = byEntry.get(e.id);
    if (!rows || rows.length === 0) continue;
    out.push({
      id: e.id,
      kind: e.kind,
      slug: e.slug,
      title: e.title,
      body: e.body,
      place: e.place,
      takenOn: e.taken_on,
      publishedAt: e.published_at ?? e.created_at,
      coverItemId: e.cover_item_id,
      items: [...rows].sort((a, b) => a.position - b.position).map((r) => toPublicItem(r, publicUrl)),
    });
  }
  return out;
}

export function appendFeed(blocks: FeedBlock[], more: PublicEntry[]): FeedBlock[] {
  const out = blocks.map((b) => (b.type === "singles" ? { ...b, entries: [...b.entries] } : b));
  for (const entry of more) {
    if (entry.kind === "outing") {
      out.push({ type: "outing", entry });
      continue;
    }
    const last = out[out.length - 1];
    if (last && last.type === "singles") last.entries.push(entry);
    else out.push({ type: "singles", entries: [entry] });
  }
  return out;
}

export function groupFeed(entries: PublicEntry[]): FeedBlock[] {
  return appendFeed([], entries);
}

export function encodeCursor(c: FeedCursor): string {
  const bytes = new TextEncoder().encode(JSON.stringify(c));
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeCursor(s: string): FeedCursor | null {
  try {
    if (!/^[A-Za-z0-9_-]+$/.test(s)) return null;
    const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
    const bin = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
    const bytes = Uint8Array.from(bin, (ch) => ch.charCodeAt(0));
    const v: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (!v || typeof v !== "object" || Array.isArray(v)) return null;
    const { takenOn, publishedAt, id } = v as Record<string, unknown>;
    if (typeof takenOn !== "string" || typeof publishedAt !== "string" || typeof id !== "string") return null;
    return { takenOn, publishedAt, id };
  } catch {
    return null;
  }
}

export function cursorFilter(c: FeedCursor): string {
  const d = c.takenOn;
  const p = `"${c.publishedAt}"`;
  return `taken_on.lt.${d},and(taken_on.eq.${d},published_at.lt.${p}),and(taken_on.eq.${d},published_at.eq.${p},id.lt.${c.id})`;
}
