"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { requirePortalRole, logPortalAudit } from "@/lib/portal/session";
import { createAdminSupabase } from "@/lib/supabase/admin";

export type ElectionActionState = { error?: string; success?: boolean };

/**
 * Anything that changes which election is active, its candidate list, or its
 * published state invalidates the short-lived `election-results` caches
 * (`getActiveElection`, the results aggregate) so the next render is fresh.
 */
function revalidateElectionData() {
  revalidateTag("election-results", "max");
  revalidatePath("/portal/admin/elections");
}

export async function listElections() {
  const admin = createAdminSupabase();
  const { data } = await admin
    .from("elections")
    .select(
      "id, name, status, published, results_published_at, created_at, candidates(id, name, party, is_incumbent, display_order)",
    )
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function createElection(
  _prev: ElectionActionState,
  formData: FormData,
): Promise<ElectionActionState> {
  const session = await requirePortalRole(["constituency_admin"]);
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Election name is required." };

  const admin = createAdminSupabase();
  const { data, error } = await admin.from("elections").insert({ name }).select("id").single();
  if (error || !data) return { error: "Failed to create election." };

  await logPortalAudit({
    action: "INSERT",
    tableName: "elections",
    recordId: data.id,
    performedBy: session.id,
    notes: `Election created: ${name}`,
  });

  revalidateElectionData();
  return { success: true };
}

export async function addCandidate(
  _prev: ElectionActionState,
  formData: FormData,
): Promise<ElectionActionState> {
  const session = await requirePortalRole(["constituency_admin"]);
  const electionId = String(formData.get("election_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const party = String(formData.get("party") ?? "").trim();
  const isIncumbent = formData.get("is_incumbent") === "on";
  if (!electionId || !name) return { error: "Candidate name is required." };

  const admin = createAdminSupabase();
  const { error } = await admin.from("candidates").insert({
    election_id: electionId,
    name,
    party: party || null,
    is_incumbent: isIncumbent,
  });
  if (error) return { error: "Failed to add candidate." };

  await logPortalAudit({
    action: "INSERT",
    tableName: "candidates",
    performedBy: session.id,
    notes: `Candidate added: ${name} (${party || "no party"})`,
  });

  revalidateElectionData();
  return { success: true };
}

export async function updateElection(
  _prev: ElectionActionState,
  formData: FormData,
): Promise<ElectionActionState> {
  const session = await requirePortalRole(["constituency_admin"]);
  const electionId = String(formData.get("election_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!electionId) return { error: "Missing election." };
  if (!name) return { error: "Election name is required." };

  const admin = createAdminSupabase();
  const { error } = await admin.from("elections").update({ name }).eq("id", electionId);
  if (error) return { error: "Could not rename the election." };

  await logPortalAudit({
    action: "UPDATE",
    tableName: "elections",
    recordId: electionId,
    performedBy: session.id,
    notes: `Renamed to: ${name}`,
  });

  revalidateElectionData();
  revalidatePath("/results");
  return { success: true };
}

/** Delete a draft election. Refused once it is active/closed or has any results. */
export async function deleteElection(
  _prev: ElectionActionState,
  formData: FormData,
): Promise<ElectionActionState> {
  const session = await requirePortalRole(["constituency_admin"]);
  const electionId = String(formData.get("election_id") ?? "");
  if (!electionId) return { error: "Missing election." };

  const admin = createAdminSupabase();
  const { data: election } = await admin
    .from("elections")
    .select("id, name, status")
    .eq("id", electionId)
    .maybeSingle();
  if (!election) return { error: "Election not found." };
  if (election.status !== "draft") {
    return { error: "Only a draft election can be deleted. Set it back to draft first, or close it instead." };
  }

  const { count } = await admin
    .from("election_results")
    .select("id", { count: "exact", head: true })
    .eq("election_id", electionId);
  if (count && count > 0) {
    return { error: "This election already has submitted results and cannot be deleted." };
  }

  await admin.from("candidates").delete().eq("election_id", electionId);
  const { error } = await admin.from("elections").delete().eq("id", electionId);
  if (error) return { error: "Could not delete the election." };

  await logPortalAudit({
    action: "ELECTION_DELETED",
    tableName: "elections",
    recordId: electionId,
    performedBy: session.id,
    notes: `Deleted draft election: ${election.name}`,
  });

  revalidateElectionData();
  return { success: true };
}

export async function updateCandidate(
  _prev: ElectionActionState,
  formData: FormData,
): Promise<ElectionActionState> {
  const session = await requirePortalRole(["constituency_admin"]);
  const candidateId = String(formData.get("candidate_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const party = String(formData.get("party") ?? "").trim();
  const isIncumbent = formData.get("is_incumbent") === "on";
  if (!candidateId) return { error: "Missing candidate." };
  if (!name) return { error: "Candidate name is required." };

  const admin = createAdminSupabase();
  const { error } = await admin
    .from("candidates")
    .update({ name, party: party || null, is_incumbent: isIncumbent })
    .eq("id", candidateId);
  if (error) return { error: "Could not save the candidate." };

  await logPortalAudit({
    action: "UPDATE",
    tableName: "candidates",
    recordId: candidateId,
    performedBy: session.id,
    notes: `Candidate updated: ${name} (${party || "no party"})`,
  });

  revalidateElectionData();
  revalidatePath("/results");
  return { success: true };
}

/** Remove a candidate. Refused if any result has already been recorded for them. */
export async function removeCandidate(
  _prev: ElectionActionState,
  formData: FormData,
): Promise<ElectionActionState> {
  const session = await requirePortalRole(["constituency_admin"]);
  const candidateId = String(formData.get("candidate_id") ?? "");
  if (!candidateId) return { error: "Missing candidate." };

  const admin = createAdminSupabase();
  const { data: candidate } = await admin
    .from("candidates")
    .select("id, name")
    .eq("id", candidateId)
    .maybeSingle();
  if (!candidate) return { error: "Candidate not found." };

  const { count } = await admin
    .from("election_results")
    .select("id", { count: "exact", head: true })
    .eq("candidate_id", candidateId);
  if (count && count > 0) {
    return { error: "Results have already been recorded for this candidate, so they cannot be removed." };
  }

  const { error } = await admin.from("candidates").delete().eq("id", candidateId);
  if (error) return { error: "Could not remove the candidate." };

  await logPortalAudit({
    action: "CANDIDATE_REMOVED",
    tableName: "candidates",
    recordId: candidateId,
    performedBy: session.id,
    notes: `Candidate removed: ${candidate.name}`,
  });

  revalidateElectionData();
  revalidatePath("/results");
  return { success: true };
}

export async function setElectionStatus(
  _prev: ElectionActionState,
  formData: FormData,
): Promise<ElectionActionState> {
  const session = await requirePortalRole(["constituency_admin"]);
  const electionId = String(formData.get("election_id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!["draft", "active", "closed"].includes(status)) return { error: "Invalid status." };

  const admin = createAdminSupabase();
  const { error } = await admin.from("elections").update({ status }).eq("id", electionId);
  if (error) return { error: "Failed to update election status." };

  await logPortalAudit({
    action: "UPDATE",
    tableName: "elections",
    recordId: electionId,
    performedBy: session.id,
    notes: `Status set to ${status}`,
  });

  revalidateElectionData();
  return { success: true };
}

/**
 * Publishing is independent of election status — a manual decision, not a
 * side effect of marking an election active/closed. Public /results shows
 * nothing until this is flipped, regardless of how far collation has gotten.
 */
export async function setElectionPublished(
  _prev: ElectionActionState,
  formData: FormData,
): Promise<ElectionActionState> {
  const session = await requirePortalRole(["constituency_admin"]);
  const electionId = String(formData.get("election_id") ?? "");
  const published = formData.get("published") === "true";

  const admin = createAdminSupabase();
  const { error } = await admin
    .from("elections")
    .update({ published, results_published_at: published ? new Date().toISOString() : null })
    .eq("id", electionId);
  if (error) return { error: "Failed to update publish status." };

  await logPortalAudit({
    action: published ? "RESULTS_PUBLISHED" : "RESULTS_UNPUBLISHED",
    tableName: "elections",
    recordId: electionId,
    performedBy: session.id,
  });

  revalidateElectionData();
  revalidatePath("/results");
  return { success: true };
}
