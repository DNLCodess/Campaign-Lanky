"use server";

import { revalidatePath } from "next/cache";
import { requirePortalRole, logPortalAudit } from "@/lib/portal/session";
import { createAdminSupabase } from "@/lib/supabase/admin";

export type RewardActionState = { error?: string; success?: boolean };

export type RewardListRow = {
  id: string;
  status: "pending" | "approved" | "sent";
  amount: number | null;
  note: string | null;
  created_at: string;
  approved_at: string | null;
  sent_at: string | null;
  trigger_type: string;
  portal_accounts: {
    full_name: string;
    email: string;
    role: string;
    lga: string | null;
    ward: number | null;
    polling_unit: string | null;
  } | null;
  team_leaders: {
    full_name: string;
    title: string;
    level: string;
    lga: string | null;
    ward: number | null;
    polling_unit: string | null;
  } | null;
};

export async function listRewards(): Promise<RewardListRow[]> {
  await requirePortalRole(["constituency_admin"]);
  const admin = createAdminSupabase();
  const { data } = await admin
    .from("rewards")
    .select(
      "id, status, amount, note, created_at, approved_at, sent_at, trigger_type, " +
        "portal_accounts!rewards_recipient_id_fkey(full_name, email, role, lga, ward, polling_unit), " +
        "team_leaders!rewards_team_leader_id_fkey(full_name, title, level, lga, ward, polling_unit)",
    )
    .order("created_at", { ascending: false });
  return (data ?? []) as unknown as RewardListRow[];
}

export async function getMyReward(electionId: string) {
  const session = await requirePortalRole(["pu_agent"]);
  const admin = createAdminSupabase();
  const { data } = await admin
    .from("rewards")
    .select("id, status, amount, note")
    .eq("recipient_id", session.id)
    .eq("trigger_type", "result_submission")
    .eq("trigger_ref", electionId)
    .maybeSingle();
  return data;
}

export async function approveReward(
  _prev: RewardActionState,
  formData: FormData,
): Promise<RewardActionState> {
  const session = await requirePortalRole(["constituency_admin"]);
  const rewardId = String(formData.get("reward_id") ?? "");
  const amount = formData.get("amount") ? Number(formData.get("amount")) : null;
  const note = String(formData.get("note") ?? "").trim();

  const admin = createAdminSupabase();
  const { error } = await admin
    .from("rewards")
    .update({
      status: "approved",
      amount,
      note: note || null,
      approved_by: session.id,
      approved_at: new Date().toISOString(),
    })
    .eq("id", rewardId)
    .eq("status", "pending");

  if (error) return { error: "Failed to approve reward." };

  await logPortalAudit({
    action: "REWARD_APPROVED",
    tableName: "rewards",
    recordId: rewardId,
    performedBy: session.id,
  });

  revalidatePath("/portal/admin/rewards");
  return { success: true };
}

export type RewardRecipientMatch = {
  id: string;
  full_name: string;
  subtitle: string;
  kind: "portal_account" | "team_leader";
};

/** Search across both portal accounts and team-leader-directory entries, for the "grant a reward" recipient picker. */
export async function searchRewardRecipients(query: string): Promise<RewardRecipientMatch[]> {
  await requirePortalRole(["constituency_admin"]);
  const q = query.trim().slice(0, 80);
  if (!q) return [];

  const admin = createAdminSupabase();
  const [{ data: accounts }, { data: leaders }] = await Promise.all([
    admin
      .from("portal_accounts")
      .select("id, full_name, email, role")
      .or(`full_name.ilike.%${q}%,email.ilike.%${q}%`)
      .limit(8),
    admin
      .from("team_leaders")
      .select("id, full_name, title, email")
      .or(`full_name.ilike.%${q}%,email.ilike.%${q}%`)
      .limit(8),
  ]);

  return [
    ...(accounts ?? []).map((a) => ({
      id: a.id,
      full_name: a.full_name,
      subtitle: `${a.role} · ${a.email}`,
      kind: "portal_account" as const,
    })),
    ...(leaders ?? []).map((l) => ({
      id: l.id,
      full_name: l.full_name,
      subtitle: `${l.title}${l.email ? ` · ${l.email}` : ""}`,
      kind: "team_leader" as const,
    })),
  ];
}

export async function grantManualReward(
  _prev: RewardActionState,
  formData: FormData,
): Promise<RewardActionState> {
  const session = await requirePortalRole(["constituency_admin"]);
  const recipientId = String(formData.get("recipient_id") ?? "");
  const recipientKind = String(formData.get("recipient_kind") ?? "");
  const amount = formData.get("amount") ? Number(formData.get("amount")) : null;
  const note = String(formData.get("note") ?? "").trim();

  if (!recipientId || !["portal_account", "team_leader"].includes(recipientKind)) {
    return { error: "Search and pick a recipient first." };
  }

  const admin = createAdminSupabase();
  const { error } = await admin.from("rewards").insert({
    recipient_id: recipientKind === "portal_account" ? recipientId : null,
    team_leader_id: recipientKind === "team_leader" ? recipientId : null,
    trigger_type: "manual",
    amount,
    note: note || null,
    created_by: session.id,
  });

  if (error) return { error: "Failed to grant reward." };

  await logPortalAudit({
    action: "REWARD_GRANTED",
    tableName: "rewards",
    performedBy: session.id,
    notes: `Manual reward granted (${recipientKind})`,
  });

  revalidatePath("/portal/admin/rewards");
  return { success: true };
}

export async function markRewardSent(
  _prev: RewardActionState,
  formData: FormData,
): Promise<RewardActionState> {
  const session = await requirePortalRole(["constituency_admin"]);
  const rewardId = String(formData.get("reward_id") ?? "");

  const admin = createAdminSupabase();
  const { error } = await admin
    .from("rewards")
    .update({ status: "sent", sent_by: session.id, sent_at: new Date().toISOString() })
    .eq("id", rewardId)
    .eq("status", "approved");

  if (error) return { error: "Failed to mark reward as sent." };

  await logPortalAudit({
    action: "REWARD_SENT",
    tableName: "rewards",
    recordId: rewardId,
    performedBy: session.id,
  });

  revalidatePath("/portal/admin/rewards");
  return { success: true };
}
