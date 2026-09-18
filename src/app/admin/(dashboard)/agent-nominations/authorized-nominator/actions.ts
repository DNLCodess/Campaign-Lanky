"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { createAdminSupabase } from "@/lib/supabase/admin";

export type NominatorActionState = { error?: string; success?: string };

const MAX_SIGNATURE_SIZE = 2 * 1024 * 1024; // 2 MB
const ALLOWED_SIGNATURE_TYPES = ["image/png"];
const SIGNATURE_PATH = "authorized-nominator/signature.png";

/** Single upsert: creates the one-and-only row on first save, replaces it on every later save. */
export async function setAuthorizedNominator(
  _prev: NominatorActionState,
  formData: FormData,
): Promise<NominatorActionState> {
  await requireAdmin();

  const fullName = String(formData.get("full_name") ?? "").trim();
  const signature = formData.get("signature");

  if (!fullName) return { error: "Full name is required." };

  const admin = createAdminSupabase();

  let signaturePath = SIGNATURE_PATH;
  if (signature instanceof File && signature.size > 0) {
    if (signature.size > MAX_SIGNATURE_SIZE) return { error: "Signature file must be under 2MB." };
    if (!ALLOWED_SIGNATURE_TYPES.includes(signature.type)) {
      return { error: "Signature must be a PNG file." };
    }
    const { error: uploadError } = await admin.storage
      .from("agent-nominations")
      .upload(SIGNATURE_PATH, signature, { contentType: "image/png", upsert: true });
    if (uploadError) return { error: "Failed to upload signature. Please try again." };
  } else {
    const { data: existing } = await admin
      .from("authorized_nominator")
      .select("signature_storage_path")
      .eq("id", true)
      .maybeSingle();
    if (!existing) return { error: "A signature PNG is required for first-time setup." };
    signaturePath = existing.signature_storage_path;
  }

  const { error: upsertError } = await admin.from("authorized_nominator").upsert({
    id: true,
    full_name: fullName,
    signature_storage_path: signaturePath,
    updated_at: new Date().toISOString(),
  });
  if (upsertError) return { error: "Failed to save. Please try again." };

  revalidatePath("/admin/agent-nominations/authorized-nominator");
  return { success: `Authorised Nominator set to ${fullName}.` };
}

export async function getAuthorizedNominator() {
  await requireAdmin();
  const admin = createAdminSupabase();
  const { data } = await admin
    .from("authorized_nominator")
    .select("full_name, signature_storage_path, updated_at")
    .eq("id", true)
    .maybeSingle();
  if (!data) return null;

  const { data: signed } = await admin.storage
    .from("agent-nominations")
    .createSignedUrl(data.signature_storage_path, 3600);

  return { ...data, signatureUrl: signed?.signedUrl ?? null };
}
