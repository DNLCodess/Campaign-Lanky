"use server";

import { getFeedPage } from "@/lib/gallery/queries";
import type { FeedPage } from "@/lib/gallery/types";

const PAGE_SIZE = 12;
const MAX_CURSOR_LENGTH = 512;

/** Public: next page of the gallery feed. Only the opaque cursor comes from the client. */
export async function loadGalleryPage(cursor: string | null): Promise<FeedPage> {
  if (typeof cursor !== "string" || cursor.length === 0 || cursor.length > MAX_CURSOR_LENGTH) {
    return { entries: [], nextCursor: null };
  }
  return getFeedPage(cursor, PAGE_SIZE, { throwOnError: true });
}
