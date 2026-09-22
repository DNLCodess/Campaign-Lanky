"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { generateSecurePassword } from "@/lib/portal/password";
import { ELECTION_TYPES, type ElectionType } from "@/lib/agents/constants";

export type CandidateActionState = {
  error?: string;
  success?: string;
  createdName?: string;
  createdEmail?: string;
  plainPassword?: string;
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function createCandidate(
  _prev: CandidateActionState,
  formData: FormData,
): Promise<CandidateActionState> {
  await requireAdmin();

  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const office = String(formData.get("office") ?? "").trim();
  const electionType = String(formData.get("election_type") ?? "");

  if (!fullName) return { error: "Full name is required." };
  if (!email || !email.includes("@")) return { error: "Enter a valid email address." };
  if (!office) return { error: "Office is required." };
  if (!ELECTION_TYPES.includes(electionType as ElectionType)) {
    return { error: "Select a valid election type." };
  }

  const slug = slugify(fullName);
  if (!slug) return { error: "Could not derive a link from that name. Use at least one letter or number." };

  const admin = createAdminSupabase();

  const { data: existingSlug } = await admin
    .from("nomination_candidates")
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

  const { error: insertError } = await admin.from("nomination_candidates").insert({
    id: authUser.user.id,
    email,
    full_name: fullName,
    office,
    election_type: electionType,
    slug,
  });
  if (insertError) {
    await admin.auth.admin.deleteUser(authUser.user.id);
    return { error: "Failed to create candidate record. Please try again." };
  }

  revalidatePath("/admin/agent-nominations/candidates");
  return {
    success: `Candidate account created for ${fullName}.`,
    createdName: fullName,
    createdEmail: email,
    plainPassword,
  };
}

export async function listCandidates() {
  await requireAdmin();
  const admin = createAdminSupabase();
  const { data } = await admin
    .from("nomination_candidates")
    .select("id, full_name, email, office, election_type, slug, is_active, created_at")
    .order("created_at", { ascending: false });
  return data ?? [];
}
