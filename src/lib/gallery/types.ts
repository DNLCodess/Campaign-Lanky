export type MediaType = "image" | "video" | "youtube";
export type EntryKind = "outing" | "single";
export type Variants = { "640"?: string; "1280"?: string; "2048"?: string }; // storage paths in bucket `gallery`
export type ItemRow = {
  id: string; entry_id: string; position: number; media_type: MediaType;
  storage_path: string | null; variants: Variants | null; poster_path: string | null; blur: string | null;
  width: number; height: number; duration_s: number | null; youtube_id: string | null; youtube_short: boolean;
  caption: string | null; hidden: boolean; processing: "pending" | "ready" | "failed"; error: string | null;
};
export type EntryRow = {
  id: string; kind: EntryKind; title: string; body: string | null; place: string | null;
  taken_on: string; slug: string; status: "draft" | "published"; cover_item_id: string | null;
  published_at: string | null; created_at: string; updated_at: string;
};
export type PublicItem = {
  id: string; type: MediaType; width: number; height: number; blur: string | null;
  src: string | null; srcSet: string | null; videoUrl: string | null; durationS: number | null;
  youtubeId: string | null; caption: string | null;
};
export type PublicEntry = {
  id: string; kind: EntryKind; slug: string; title: string; body: string | null;
  place: string | null; takenOn: string; publishedAt: string; coverItemId: string | null; items: PublicItem[];
};
export type FeedBlock =
  | { type: "outing"; entry: PublicEntry }
  | { type: "singles"; entries: PublicEntry[] };
export type FeedCursor = { takenOn: string; publishedAt: string; id: string };
export type FeedPage = { entries: PublicEntry[]; nextCursor: string | null };
