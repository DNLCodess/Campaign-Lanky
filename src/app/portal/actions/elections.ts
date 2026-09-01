"use server";

import { revalidatePath } from "next/cache";
import { requirePortalRole, logPortalAudit } from "@/lib/portal/session";
import { createAdminSupabase } from "@/lib/supabase/admin";

export type ElectionActionState = { error?: string; success?: boolean };

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

  revalidatePath("/portal/admin/elections");
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

  revalidatePath("/portal/admin/elections");
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

  revalidatePath("/portal/admin/elections");
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

  revalidatePath("/portal/admin/elections");
  revalidatePath("/results");
  return { success: true };
}
