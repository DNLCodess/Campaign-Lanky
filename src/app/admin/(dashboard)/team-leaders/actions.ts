"use server";

import { revalidatePath } from "next/cache";
import { getAdminUser, requireAdmin } from "@/lib/admin-auth";
import { createAdminSupabase } from "@/lib/supabase/admin";
import type { TeamLeaderLevel } from "@/lib/team-leaders";

export type LeaderState = { error?: string; success?: string };

type LeaderInput = {
  full_name: string;
  title: string;
  phone: string | null;
  email: string | null;
  level: TeamLeaderLevel;
  lga: string | null;
  ward: number | null;
  polling_unit: string | null;
  portal_account_id: string | null;
  notes: string | null;
};

const LEVELS: TeamLeaderLevel[] = ["constituency", "lga", "ward", "polling_unit"];

function parseForm(formData: FormData): LeaderInput | { error: string } {
  const full_name = String(formData.get("full_name") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const level = String(formData.get("level") ?? "") as TeamLeaderLevel;
  const lga = String(formData.get("lga") ?? "").trim();
  const wardRaw = String(formData.get("ward") ?? "").trim();
  const polling_unit = String(formData.get("polling_unit") ?? "").trim();
  const portal_account_id = String(formData.get("portal_account_id") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!full_name) return { error: "Name is required." };
  if (!title) return { error: "Title is required." };
  if (email && !email.includes("@")) return { error: "Enter a valid email address." };
  if (!LEVELS.includes(level)) return { error: "Select a valid level." };

  const ward = wardRaw ? Number(wardRaw) : null;

  if (level === "constituency" && (lga || ward || polling_unit)) {
    return { error: "A constituency-level leader has no LGA/ward/polling unit." };
  }
  if (level === "lga" && (!lga || ward || polling_unit)) {
    return { error: "An LGA-level leader needs an LGA and no ward/polling unit." };
  }
  if (level === "ward" && (!lga || !ward || polling_unit)) {
    return { error: "A ward-level leader needs an LGA and ward, and no polling unit." };
  }
  if (level === "polling_unit" && (!lga || !ward || !polling_unit)) {
    return { error: "A polling-unit-level leader needs an LGA, ward, and polling unit." };
  }

  return {
    full_name,
    title,
    phone: phone || null,
    email: email || null,
    level,
    lga: lga || null,
    ward,
    polling_unit: polling_unit || null,
    portal_account_id: portal_account_id || null,
    notes: notes || null,
  };
}

export async function createTeamLeader(
  _prev: LeaderState,
  formData: FormData,
): Promise<LeaderState> {
  const user = await requireAdmin();
  const parsed = parseForm(formData);
  if ("error" in parsed) return parsed;

  try {
    const supabase = createAdminSupabase();
    const { error } = await supabase
      .from("team_leaders")
      .insert({ ...parsed, created_by: user.email ?? null });
    if (error) return { error: error.message };
    revalidatePath("/admin/team-leaders");
    return { success: `${parsed.full_name} added.` };
  } catch (err) {
    console.error("[createTeamLeader]", err);
    return { error: "Could not add the leader." };
  }
}

export async function updateTeamLeader(
  _prev: LeaderState,
  formData: FormData,
): Promise<LeaderState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing record id." };
  const parsed = parseForm(formData);
  if ("error" in parsed) return parsed;

  try {
    const supabase = createAdminSupabase();
    const { error } = await supabase.from("team_leaders").update(parsed).eq("id", id);
    if (error) return { error: error.message };
    revalidatePath("/admin/team-leaders");
    return { success: `${parsed.full_name} updated.` };
  } catch (err) {
    console.error("[updateTeamLeader]", err);
    return { error: "Could not update the leader." };
  }
}

export async function deleteTeamLeader(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  try {
    const supabase = createAdminSupabase();
    await supabase.from("team_leaders").delete().eq("id", id);
    revalidatePath("/admin/team-leaders");
  } catch (err) {
    console.error("[deleteTeamLeader]", err);
  }
}

export type PortalAccountMatch = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  lga: string | null;
  ward: number | null;
  polling_unit: string | null;
};

/** Search portal accounts by name/email, for the optional "link to portal login" picker. */
export async function searchPortalAccounts(query: string): Promise<PortalAccountMatch[]> {
  if (!(await getAdminUser())) return [];
  const q = query.trim().slice(0, 80);
  if (!q) return [];

  const supabase = createAdminSupabase();
  const { data } = await supabase
    .from("portal_accounts")
    .select("id, full_name, email, role, lga, ward, polling_unit")
    .or(`full_name.ilike.%${q}%,email.ilike.%${q}%`)
    .limit(10);
  return data ?? [];
}

/** Resolves a single portal account for display when editing an already-linked leader. */
export async function getPortalAccountById(id: string): Promise<PortalAccountMatch | null> {
  if (!(await getAdminUser())) return null;
  if (!id) return null;

  const supabase = createAdminSupabase();
  const { data } = await supabase
    .from("portal_accounts")
    .select("id, full_name, email, role, lga, ward, polling_unit")
    .eq("id", id)
    .maybeSingle();
  return data ?? null;
}
