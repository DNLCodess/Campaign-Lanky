"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { generateSecurePassword } from "@/lib/portal/password";
import { ELECTION_TYPES, type ElectionType } from "@/lib/agents/constants";
import { areaColumnFor, listConstituencies } from "@/lib/agents/geo";

export type CandidateActionState = {
  error?: string;
  success?: string;
  createdName?: string;
  createdEmail?: string;
  createdSlug?: string;
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
  const area = await parseConstituency(electionType as ElectionType, formData.get("constituency_id"));
  if ("error" in area) return { error: area.error };

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
    constituency_id: area.constituencyId,
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
    createdSlug: slug,
    plainPassword,
  };
}

export async function listCandidates() {
  await requireAdmin();
  const admin = createAdminSupabase();
  const { data } = await admin
    .from("nomination_candidates")
    .select("id, full_name, email, office, election_type, constituency_id, slug, is_active, created_at")
    .order("created_at", { ascending: false });
  return data ?? [];
}

/**
 * Validates a submitted constituency against the election type: required and
 * must be a real INEC constituency of the right kind for constituency-scoped
 * offices; always null for statewide ones (governorship, presidential).
 */
async function parseConstituency(
  electionType: ElectionType,
  raw: FormDataEntryValue | null,
): Promise<{ constituencyId: number | null } | { error: string }> {
  if (areaColumnFor(electionType) === null) return { constituencyId: null };
  const id = Number(raw);
  if (!raw || !Number.isInteger(id)) return { error: "Select the candidate's constituency." };
  const options = await listConstituencies(electionType);
  if (!options.some((o) => o.id === id)) return { error: "Select a valid constituency for this election type." };
  return { constituencyId: id };
}

export type AreaActionState = { error?: string; success?: string };

/**
 * Changes which constituency a candidate's agents come from, then recomputes
 * the "outside area" flag on every one of their existing nominations, so a
 * wrong area can be corrected without touching nominations by hand.
 */
export async function updateCandidateArea(
  _prev: AreaActionState,
  formData: FormData,
): Promise<AreaActionState> {
  await requireAdmin();
  const candidateId = String(formData.get("candidate_id") ?? "");
  if (!candidateId) return { error: "Missing candidate." };

  const admin = createAdminSupabase();
  const { data: candidate } = await admin
    .from("nomination_candidates")
    .select("id, election_type")
    .eq("id", candidateId)
    .maybeSingle();
  if (!candidate) return { error: "Candidate not found." };

  const area = await parseConstituency(candidate.election_type as ElectionType, formData.get("constituency_id"));
  if ("error" in area) return { error: area.error };

  const { error: updateError } = await admin
    .from("nomination_candidates")
    .update({ constituency_id: area.constituencyId })
    .eq("id", candidateId);
  if (updateError) return { error: "Failed to save the constituency. Please try again." };

  const { data: flagged, error: flagError } = await admin.rpc("refresh_outside_area_flags", {
    p_candidate_id: candidateId,
  });
  revalidatePath("/admin/agent-nominations/candidates");
  if (flagError) {
    console.error("[agents] refresh_outside_area_flags failed for candidate", candidateId, flagError);
    return { error: "Constituency saved, but existing nominations couldn't be re-checked. Save again to retry." };
  }
  const n = Number(flagged ?? 0);
  return {
    success:
      n === 0
        ? "Constituency saved. All existing nominations are inside it."
        : `Constituency saved. ${n} existing ${n === 1 ? "nomination is" : "nominations are"} outside it and flagged.`,
  };
}
