"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { generateSecurePassword } from "@/lib/portal/password";
import { ELECTION_TYPES, type ElectionType } from "@/lib/agents/constants";

export type AuthorityActionState = {
  error?: string;
  success?: string;
  createdName?: string;
  createdEmail?: string;
  plainPassword?: string;
};

const MAX_SIGNATURE_SIZE = 2 * 1024 * 1024; // 2 MB
const ALLOWED_SIGNATURE_TYPES = ["image/png"];

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function createAuthority(
  _prev: AuthorityActionState,
  formData: FormData,
): Promise<AuthorityActionState> {
  await requireAdmin();

  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const office = String(formData.get("office") ?? "").trim();
  const electionType = String(formData.get("election_type") ?? "");
  const slugInput = String(formData.get("slug") ?? "").trim();
  const signature = formData.get("signature");

  if (!fullName) return { error: "Full name is required." };
  if (!email || !email.includes("@")) return { error: "Enter a valid email address." };
  if (!office) return { error: "Office is required." };
  if (!ELECTION_TYPES.includes(electionType as ElectionType)) {
    return { error: "Select a valid election type." };
  }
  if (!(signature instanceof File) || signature.size === 0) {
    return { error: "A signature PNG is required." };
  }
  if (signature.size > MAX_SIGNATURE_SIZE) return { error: "Signature file must be under 2MB." };
  if (!ALLOWED_SIGNATURE_TYPES.includes(signature.type)) {
    return { error: "Signature must be a PNG file." };
  }

  const slug = slugInput ? slugify(slugInput) : slugify(fullName);
  if (!slug) return { error: "Could not derive a slug from the name — set one explicitly." };

  const admin = createAdminSupabase();

  const { data: existingSlug } = await admin
    .from("nomination_authorities")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (existingSlug) return { error: `Slug "${slug}" is already in use.` };

  const plainPassword = generateSecurePassword(12);
  const { data: authUser, error: authError } = await admin.auth.admin.createUser({
    email,
    password: plainPassword,
    email_confirm: true,
  });
  if (authError || !authUser.user) {
    if (authError?.message?.includes("already registered")) {
      return { error: "An account with this email already exists." };
    }
    return { error: "Failed to create account. Please try again." };
  }

  const signaturePath = `signatures/${authUser.user.id}.png`;
  const { error: uploadError } = await admin.storage
    .from("agent-nominations")
    .upload(signaturePath, signature, { contentType: "image/png", upsert: false });
  if (uploadError) {
    await admin.auth.admin.deleteUser(authUser.user.id);
    return { error: "Failed to upload signature. Please try again." };
  }

  const { error: insertError } = await admin.from("nomination_authorities").insert({
    id: authUser.user.id,
    email,
    full_name: fullName,
    office,
    election_type: electionType,
    slug,
    signature_storage_path: signaturePath,
  });
  if (insertError) {
    await admin.storage.from("agent-nominations").remove([signaturePath]);
    await admin.auth.admin.deleteUser(authUser.user.id);
    return { error: "Failed to create authority record. Please try again." };
  }

  revalidatePath("/admin/agent-nominations/authorities");
  return {
    success: `Authority account created for ${fullName}.`,
    createdName: fullName,
    createdEmail: email,
    plainPassword,
  };
}

export async function listAuthorities() {
  await requireAdmin();
  const admin = createAdminSupabase();
  const { data } = await admin
    .from("nomination_authorities")
    .select("id, full_name, email, office, election_type, slug, is_active, created_at")
    .order("created_at", { ascending: false });
  return data ?? [];
}
