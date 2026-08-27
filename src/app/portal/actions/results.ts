"use server";

import { revalidatePath } from "next/cache";
import { requirePortalRole, logPortalAudit } from "@/lib/portal/session";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { computeResultChecksum } from "@/lib/portal/checksum";

export type ResultActionState = { error?: string; success?: boolean };

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png"];

export async function submitElectionResult(
  _prev: ResultActionState,
  formData: FormData,
): Promise<ResultActionState> {
  const session = await requirePortalRole(["pu_agent"]);
  if (!session.lga || !session.ward || !session.polling_unit) {
    return { error: "Your account is missing polling unit assignment." };
  }

  const electionId = String(formData.get("election_id") ?? "");
  const accreditedVoters = Number(formData.get("accredited_voters"));
  const registeredVoters = Number(formData.get("registered_voters"));
  const notes = String(formData.get("notes") ?? "").trim();
  const photo = formData.get("photo");

  if (!electionId) return { error: "Election is required." };
  if (!Number.isFinite(accreditedVoters) || accreditedVoters < 0) {
    return { error: "Enter a valid accredited voters count." };
  }
  if (!Number.isFinite(registeredVoters) || registeredVoters < 0) {
    return { error: "Enter a valid registered voters count." };
  }
  if (!(photo instanceof File) || photo.size === 0) {
    return { error: "A photo of the result sheet is required." };
  }
  if (photo.size > MAX_IMAGE_SIZE) return { error: "Photo must be under 10MB." };
  if (!ALLOWED_TYPES.includes(photo.type)) return { error: "Only JPEG and PNG photos are allowed." };

  const admin = createAdminSupabase();

  const { data: election } = await admin
    .from("elections")
    .select("status")
    .eq("id", electionId)
    .single();
  if (!election) return { error: "Election not found." };
  if (election.status !== "active") return { error: "This election is not accepting submissions." };

  const { data: candidates } = await admin
    .from("candidates")
    .select("id, name")
    .eq("election_id", electionId);
  if (!candidates || candidates.length === 0) return { error: "No candidates configured for this election." };

  const votes: { candidateId: string; votes: number }[] = [];
  for (const c of candidates) {
    const raw = formData.get(`votes_${c.id}`);
    const n = Number(raw);
    if (raw === null || !Number.isFinite(n) || n < 0) {
      return { error: `Enter a valid vote count for ${c.name}.` };
    }
    votes.push({ candidateId: c.id, votes: n });
  }

  const ext = photo.type === "image/png" ? "png" : "jpg";
  const path = `${session.lga}/${session.ward}/${session.polling_unit}/${electionId}-${Date.now()}.${ext}`;
  const { error: uploadError } = await admin.storage
    .from("result-sheets")
    .upload(path, photo, { contentType: photo.type, upsert: false });
  if (uploadError) return { error: "Failed to upload result sheet photo. Try again." };

  const rows = votes.map((v) => ({
    election_id: electionId,
    lga: session.lga!,
    ward: session.ward!,
    polling_unit: session.polling_unit!,
    candidate_id: v.candidateId,
    votes_cast: v.votes,
    accredited_voters: accreditedVoters,
    registered_voters: registeredVoters,
    result_image_path: path,
    notes: notes || null,
    submitted_by: session.id,
    checksum: computeResultChecksum({
      electionId,
      candidateId: v.candidateId,
      lga: session.lga!,
      ward: session.ward!,
      pollingUnit: session.polling_unit!,
      votesCast: v.votes,
      accreditedVoters,
      registeredVoters,
    }),
  }));

  const { error: insertError } = await admin.from("election_results").insert(rows);
  if (insertError) {
    if (insertError.code === "23505") {
      return { error: "You have already submitted a result for this election." };
    }
    return { error: "Failed to submit result. Please try again." };
  }

  // Ignore errors here (e.g. a unique-violation race) — the reward already
  // existing is not a failure condition for the submission itself.
  await admin.from("rewards").insert({
    recipient_id: session.id,
    trigger_type: "result_submission",
    trigger_ref: electionId,
    created_by: session.id,
  });

  await logPortalAudit({
    action: "INSERT",
    tableName: "election_results",
    performedBy: session.id,
    notes: `Result submitted for ${session.polling_unit} (${votes.length} candidates)`,
  });

  revalidatePath("/portal/pu");
  return { success: true };
}

export async function getActiveElection() {
  const admin = createAdminSupabase();
  const { data } = await admin
    .from("elections")
    .select("id, name, status, candidates(id, name, party, display_order)")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

export async function getMySubmission(electionId: string) {
  const session = await requirePortalRole(["pu_agent"]);
  if (!session.polling_unit) return null;
  const admin = createAdminSupabase();
  const { data } = await admin
    .from("election_results")
    .select("id, candidate_id, votes_cast, created_at")
    .eq("election_id", electionId)
    .eq("polling_unit", session.polling_unit);
  return data && data.length > 0 ? data : null;
}

/** Read-only roll-up for ward_agent / lga_coordinator / constituency_admin, scoped to their branch. */
export async function listResults() {
  const session = await requirePortalRole(["constituency_admin", "lga_coordinator", "ward_agent"]);
  const admin = createAdminSupabase();
  let query = admin
    .from("election_results")
    .select(
      "id, election_id, lga, ward, polling_unit, votes_cast, accredited_voters, registered_voters, created_at, candidates(name, party), portal_accounts!election_results_submitted_by_fkey(full_name)",
    )
    .order("created_at", { ascending: false });

  if (session.role === "lga_coordinator") query = query.eq("lga", session.lga);
  if (session.role === "ward_agent") query = query.eq("lga", session.lga).eq("ward", session.ward);

  const { data } = await query;
  return data ?? [];
}
