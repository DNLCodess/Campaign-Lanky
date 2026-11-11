"use server";

// Thin, admin-gated wrappers over src/lib/gallery/ops.ts. Every action derives
// identity itself via requireAdmin() — never accept user/session parameters.
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { createAdminSupabase } from "@/lib/supabase/admin";
import type { EntryKind } from "@/lib/gallery/types";
import {
  addYouTubeOp,
  createEntryOp,
  createUploadOp,
  deleteEntryOp,
  finalizeItemOp,
  removeItemOp,
  reorderItemsOp,
  setCoverOp,
  setEntryStatusOp,
  setItemCaptionOp,
  setItemHiddenOp,
  updateEntryOp,
  type CreateUploadResult,
  type UploadFile,
} from "@/lib/gallery/ops";

function revalidatePublic(): void {
  revalidatePath("/gallery");
  revalidatePath("/news");
}

export async function createEntry(kind: EntryKind): Promise<string> {
  await requireAdmin();
  return createEntryOp(createAdminSupabase(), kind);
}

export async function updateEntry(
  id: string,
  fields: { title: string; body: string | null; place: string | null; takenOn: string },
): Promise<void> {
  await requireAdmin();
  await updateEntryOp(createAdminSupabase(), id, fields);
  revalidatePublic();
}

export async function setEntryStatus(
  id: string,
  status: "draft" | "published",
): Promise<{ error?: string }> {
  await requireAdmin();
  const result = await setEntryStatusOp(createAdminSupabase(), id, status);
  if (!result.error) revalidatePublic();
  return result;
}

export async function deleteEntry(id: string): Promise<void> {
  await requireAdmin();
  await deleteEntryOp(createAdminSupabase(), id);
  revalidatePublic();
}

export async function createUpload(entryId: string, file: UploadFile): Promise<CreateUploadResult> {
  await requireAdmin();
  // A pending item is never public, so nothing to revalidate yet.
  return createUploadOp(createAdminSupabase(), entryId, file);
}

export async function finalizeItem(itemId: string): Promise<{ error?: string }> {
  await requireAdmin();
  const result = await finalizeItemOp(createAdminSupabase(), itemId);
  revalidatePublic();
  return result;
}

export async function addYouTube(entryId: string, url: string): Promise<{ error?: string }> {
  await requireAdmin();
  const result = await addYouTubeOp(createAdminSupabase(), entryId, url);
  if (!result.error) revalidatePublic();
  return result;
}

export async function reorderItems(entryId: string, orderedIds: string[]): Promise<void> {
  await requireAdmin();
  await reorderItemsOp(createAdminSupabase(), entryId, orderedIds);
  revalidatePublic();
}

export async function setCover(entryId: string, itemId: string): Promise<void> {
  await requireAdmin();
  await setCoverOp(createAdminSupabase(), entryId, itemId);
  revalidatePublic();
}

export async function setItemHidden(itemId: string, hidden: boolean): Promise<void> {
  await requireAdmin();
  await setItemHiddenOp(createAdminSupabase(), itemId, hidden);
  revalidatePublic();
}

export async function setItemCaption(itemId: string, caption: string | null): Promise<void> {
  await requireAdmin();
  await setItemCaptionOp(createAdminSupabase(), itemId, caption);
  revalidatePublic();
}

export async function removeItem(itemId: string): Promise<void> {
  await requireAdmin();
  await removeItemOp(createAdminSupabase(), itemId);
  revalidatePublic();
}
