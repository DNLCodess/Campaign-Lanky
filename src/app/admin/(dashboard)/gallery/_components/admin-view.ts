// Plain data passed from the server editor page to the client components.
// Built server-side (with galleryPublicUrl) so the client never imports server-only code.
import type { EntryRow, ItemRow, MediaType } from "@/lib/gallery/types";
import { youTubeThumb } from "@/lib/gallery/youtube";

export type AdminItemView = {
  id: string;
  type: MediaType;
  width: number;
  height: number;
  thumb: string | null;
  thumbSrcSet: string | null;
  caption: string | null;
  hidden: boolean;
  processing: ItemRow["processing"];
  error: string | null;
  durationS: number | null;
};

export type AdminEntryView = Pick<
  EntryRow,
  "id" | "kind" | "title" | "body" | "place" | "taken_on" | "status" | "cover_item_id" | "slug"
>;

export function toAdminItemView(row: ItemRow, publicUrl: (path: string) => string): AdminItemView {
  let thumb: string | null = null;
  let thumbSrcSet: string | null = null;
  if (row.media_type === "youtube" && row.youtube_id) {
    thumb = youTubeThumb(row.youtube_id, row.youtube_short);
  } else if (row.variants) {
    const parts = (["640", "1280"] as const).filter((w) => row.variants?.[w]);
    if (parts.length) {
      thumb = publicUrl(row.variants[parts[0]]!);
      thumbSrcSet = parts.map((w) => `${publicUrl(row.variants![w]!)} ${w}w`).join(", ");
    }
  }
  return {
    id: row.id,
    type: row.media_type,
    width: row.width,
    height: row.height,
    thumb,
    thumbSrcSet,
    caption: row.caption,
    hidden: row.hidden,
    processing: row.processing,
    error: row.error,
    durationS: row.duration_s,
  };
}

export function toAdminEntryView(e: EntryRow): AdminEntryView {
  return {
    id: e.id, kind: e.kind, title: e.title, body: e.body, place: e.place,
    taken_on: e.taken_on, status: e.status, cover_item_id: e.cover_item_id, slug: e.slug,
  };
}
