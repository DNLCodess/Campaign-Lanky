"use server";

import { revalidatePath } from "next/cache";
import { requirePortalRole, logPortalAudit } from "@/lib/portal/session";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { generateSecurePassword } from "@/lib/portal/password";
import { getPollingUnit } from "@/lib/portal/geo";
import { LGAS, ROLE_CONFIG, type PortalRole } from "@/lib/portal/constants";

export type AccountActionState = { error?: string; success?: boolean; plainPassword?: string };

const CREATOR_ROLES: PortalRole[] = ["constituency_admin", "lga_coordinator", "ward_agent"];

/**
 * Creates a subordinate account. lga_coordinator and ward_agent are still
 * limited to the one tier directly below them, scoped to their own branch
 * (lga_coordinator -> ward_agent within their LGA; ward_agent -> pu_agent
 * within their ward). constituency_admin is NOT scoped to a branch — they can
 * create any of the three roles, for any LGA/ward/polling unit, picking the
 * target role explicitly via `target_role` in the form. Mirrors atunluto's
 * createPUAdmin: auto-generated password, forced change on first login.
 */
export async function createPortalAccount(
  _prev: AccountActionState,
  formData: FormData,
): Promise<AccountActionState> {
  const session = await requirePortalRole(CREATOR_ROLES);
  const isAdmin = session.role === "constituency_admin";

  let targetRole: PortalRole | null;
  if (isAdmin) {
    const requested = String(formData.get("target_role") ?? "");
    targetRole = (["lga_coordinator", "ward_agent", "pu_agent"] as const).includes(
      requested as never,
    )
      ? (requested as PortalRole)
      : null;
    if (!targetRole) return { error: "Select a role to create." };
  } else {
    targetRole = ROLE_CONFIG[session.role].creates;
    if (!targetRole) return { error: "Your role cannot create accounts." };
  }

  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim();
  if (!fullName || !email) return { error: "Full name and email are required." };

  let lga: string | null = null;
  let ward: number | null = null;
  let pollingUnit: string | null = null;

  if (targetRole === "lga_coordinator") {
    lga = String(formData.get("lga") ?? "").trim();
    if (!LGAS.includes(lga as (typeof LGAS)[number])) return { error: "Select a valid LGA." };
  } else if (targetRole === "ward_agent") {
    // lga_coordinator is fixed to their own LGA; constituency_admin picks any LGA.
    lga = isAdmin ? String(formData.get("lga") ?? "").trim() : session.lga;
    ward = Number(formData.get("ward"));
    if (!lga || !LGAS.includes(lga as (typeof LGAS)[number])) return { error: "Select a valid LGA." };
    if (!ward || ward < 1) return { error: "Select a valid ward." };
  } else if (targetRole === "pu_agent") {
    // ward_agent is fixed to their own LGA/ward; constituency_admin picks any of both.
    lga = isAdmin ? String(formData.get("lga") ?? "").trim() : session.lga;
    ward = isAdmin ? Number(formData.get("ward")) : session.ward;
    pollingUnit = String(formData.get("polling_unit") ?? "").trim();
    if (!lga || !LGAS.includes(lga as (typeof LGAS)[number])) return { error: "Select a valid LGA." };
    if (!ward || ward < 1) return { error: "Select a valid ward." };
    if (!pollingUnit) return { error: "Select a valid polling unit." };

    const pu = await getPollingUnit(pollingUnit);
    if (!pu || pu.lga !== lga || pu.ward !== ward) {
      return { error: "That polling unit is not in the selected ward." };
    }
  }

  const admin = createAdminSupabase();

  if (pollingUnit) {
    const { data: existing } = await admin
      .from("portal_accounts")
      .select("id")
      .eq("polling_unit", pollingUnit)
      .eq("is_active", true)
      .maybeSingle();
    if (existing) return { error: "This polling unit already has an active agent." };
  }

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

  const { error: insertError } = await admin.from("portal_accounts").insert({
    id: authUser.user.id,
    email,
    full_name: fullName,
    phone: phone || null,
    role: targetRole,
    lga,
    ward,
    polling_unit: pollingUnit,
    must_change_password: true,
    created_by: session.id,
    parent_account_id: session.id,
  });

  if (insertError) {
    await admin.auth.admin.deleteUser(authUser.user.id);
    return { error: "Failed to create account. Please try again." };
  }

  await logPortalAudit({
    action: "INSERT",
    tableName: "portal_accounts",
    recordId: authUser.user.id,
    performedBy: session.id,
    notes: `${ROLE_CONFIG[targetRole].label} created: ${email}`,
  });

  revalidatePath("/portal");
  revalidatePath("/portal/admin/accounts");
  return { success: true, plainPassword };
}

export async function listChildAccounts() {
  const session = await requirePortalRole(CREATOR_ROLES);
  const targetRole = ROLE_CONFIG[session.role].creates;
  if (!targetRole) return [];

  const admin = createAdminSupabase();
  let query = admin
    .from("portal_accounts")
    .select("id, email, full_name, phone, role, lga, ward, polling_unit, is_active, must_change_password, last_login, created_at")
    .eq("role", targetRole)
    .order("created_at", { ascending: false });

  if (session.role === "lga_coordinator") query = query.eq("lga", session.lga);
  if (session.role === "ward_agent") query = query.eq("lga", session.lga).eq("ward", session.ward);

  const { data } = await query;
  return data ?? [];
}

export async function listAllAccounts(
  filters: { role?: PortalRole; lga?: string; ward?: number } = {},
) {
  await requirePortalRole(["constituency_admin"]);
  const admin = createAdminSupabase();
  let query = admin
    .from("portal_accounts")
    .select(
      "id, email, full_name, phone, role, lga, ward, polling_unit, is_active, must_change_password, last_login, created_at",
    )
    .in("role", ["lga_coordinator", "ward_agent", "pu_agent"])
    .order("created_at", { ascending: false });

  if (filters.role) query = query.eq("role", filters.role);
  if (filters.lga) query = query.eq("lga", filters.lga);
  if (filters.ward) query = query.eq("ward", filters.ward);

  const { data } = await query;
  return data ?? [];
}

export async function toggleAccountStatus(
  _prev: AccountActionState,
  formData: FormData,
): Promise<AccountActionState> {
  const session = await requirePortalRole(CREATOR_ROLES);
  const accountId = String(formData.get("account_id") ?? "");
  const activate = formData.get("activate") === "true";

  const admin = createAdminSupabase();
  const { data: target } = await admin
    .from("portal_accounts")
    .select("id, parent_account_id")
    .eq("id", accountId)
    .single();

  // constituency_admin can manage anyone in the hierarchy; other tiers only
  // the accounts they directly created.
  if (!target || (session.role !== "constituency_admin" && target.parent_account_id !== session.id)) {
    return { error: "You can only manage accounts you created." };
  }

  await admin.from("portal_accounts").update({ is_active: activate }).eq("id", accountId);
  if (!activate) await admin.auth.admin.signOut(accountId);

  await logPortalAudit({
    action: activate ? "ACCOUNT_ACTIVATED" : "ACCOUNT_DEACTIVATED",
    tableName: "portal_accounts",
    recordId: accountId,
    performedBy: session.id,
  });

  revalidatePath("/portal");
  return { success: true };
}

/** One account, for pre-filling the edit form. constituency_admin only. */
export async function getPortalAccountById(id: string) {
  await requirePortalRole(["constituency_admin"]);
  const admin = createAdminSupabase();
  const { data } = await admin
    .from("portal_accounts")
    .select("id, email, full_name, phone, role, lga, ward, polling_unit, is_active")
    .eq("id", id)
    .maybeSingle();
  return data;
}

/**
 * Edit an existing account's details — including its role and where it's
 * assigned. constituency_admin only, since re-homing an account across the
 * hierarchy is not something a coordinator should do.
 */
export async function updatePortalAccount(
  _prev: AccountActionState,
  formData: FormData,
): Promise<AccountActionState> {
  const session = await requirePortalRole(["constituency_admin"]);
  const accountId = String(formData.get("account_id") ?? "");
  if (!accountId) return { error: "Missing account." };

  const admin = createAdminSupabase();
  const { data: current } = await admin
    .from("portal_accounts")
    .select("id, email, role, polling_unit")
    .eq("id", accountId)
    .maybeSingle();
  if (!current) return { error: "Account not found." };

  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim();
  const role = String(formData.get("target_role") ?? current.role) as PortalRole;
  if (!fullName || !email) return { error: "Full name and email are required." };
  if (!(["lga_coordinator", "ward_agent", "pu_agent"] as const).includes(role as never)) {
    return { error: "Choose a valid role." };
  }

  let lga: string | null = null;
  let ward: number | null = null;
  let pollingUnit: string | null = null;

  if (role === "lga_coordinator") {
    lga = String(formData.get("lga") ?? "").trim();
    if (!LGAS.includes(lga as (typeof LGAS)[number])) return { error: "Choose a valid LGA." };
  } else if (role === "ward_agent") {
    lga = String(formData.get("lga") ?? "").trim();
    ward = Number(formData.get("ward"));
    if (!LGAS.includes(lga as (typeof LGAS)[number])) return { error: "Choose a valid LGA." };
    if (!ward || ward < 1) return { error: "Choose a valid ward." };
  } else {
    lga = String(formData.get("lga") ?? "").trim();
    ward = Number(formData.get("ward"));
    pollingUnit = String(formData.get("polling_unit") ?? "").trim();
    if (!LGAS.includes(lga as (typeof LGAS)[number])) return { error: "Choose a valid LGA." };
    if (!ward || ward < 1) return { error: "Choose a valid ward." };
    if (!pollingUnit) return { error: "Choose a valid polling unit." };
    const pu = await getPollingUnit(pollingUnit);
    if (!pu || pu.lga !== lga || pu.ward !== ward) {
      return { error: "That polling unit is not in the selected ward." };
    }
    if (pollingUnit !== current.polling_unit) {
      const { data: taken } = await admin
        .from("portal_accounts")
        .select("id")
        .eq("polling_unit", pollingUnit)
        .eq("is_active", true)
        .neq("id", accountId)
        .maybeSingle();
      if (taken) return { error: "Another active agent is already assigned to that polling unit." };
    }
  }

  if (email !== current.email) {
    const { error: authErr } = await admin.auth.admin.updateUserById(accountId, {
      email,
      email_confirm: true,
    });
    if (authErr) {
      return authErr.message?.includes("already")
        ? { error: "Another account already uses that email." }
        : { error: "Could not update the email address." };
    }
  }

  const { error } = await admin
    .from("portal_accounts")
    .update({ full_name: fullName, email, phone: phone || null, role, lga, ward, polling_unit: pollingUnit })
    .eq("id", accountId);
  if (error) return { error: "Could not save the changes." };

  await logPortalAudit({
    action: "ACCOUNT_UPDATED",
    tableName: "portal_accounts",
    recordId: accountId,
    performedBy: session.id,
    notes: `${ROLE_CONFIG[role].label}: ${email}`,
  });

  revalidatePath("/portal/admin/accounts");
  return { success: true };
}

/**
 * Permanently remove an account. Refused if it has submitted results or
 * received a reward — those must stay attributable, so deactivate instead.
 * Other history (audit log, messages sent) is kept with a null actor.
 */
export async function deletePortalAccount(
  _prev: AccountActionState,
  formData: FormData,
): Promise<AccountActionState> {
  const session = await requirePortalRole(["constituency_admin"]);
  const accountId = String(formData.get("account_id") ?? "");
  if (!accountId || accountId === session.id) return { error: "You cannot delete this account." };

  const admin = createAdminSupabase();
  const { data: target } = await admin
    .from("portal_accounts")
    .select("id, email, full_name, role")
    .eq("id", accountId)
    .maybeSingle();
  if (!target) return { error: "Account not found." };

  const { count: resultCount } = await admin
    .from("election_results")
    .select("id", { count: "exact", head: true })
    .eq("submitted_by", accountId);
  if (resultCount && resultCount > 0) {
    return { error: "This account has submitted results. Deactivate it instead so the results stay linked to it." };
  }

  const { count: rewardCount } = await admin
    .from("rewards")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", accountId);
  if (rewardCount && rewardCount > 0) {
    return { error: "This account has received a reward. Deactivate it instead." };
  }

  await logPortalAudit({
    action: "ACCOUNT_DELETED",
    tableName: "portal_accounts",
    recordId: accountId,
    performedBy: session.id,
    notes: `${ROLE_CONFIG[target.role as PortalRole]?.label ?? target.role}: ${target.full_name} (${target.email})`,
  });

  // portal_accounts.id -> auth.users.id is ON DELETE CASCADE, so removing the
  // auth user removes the portal row too.
  const { error } = await admin.auth.admin.deleteUser(accountId);
  if (error) return { error: "Could not delete the account. Try again." };

  revalidatePath("/portal");
  revalidatePath("/portal/admin/accounts");
  return { success: true };
}

export async function regenerateAccountPassword(
  _prev: AccountActionState,
  formData: FormData,
): Promise<AccountActionState> {
  const session = await requirePortalRole(CREATOR_ROLES);
  const accountId = String(formData.get("account_id") ?? "");

  const admin = createAdminSupabase();
  const { data: target } = await admin
    .from("portal_accounts")
    .select("id, parent_account_id")
    .eq("id", accountId)
    .single();

  if (!target || (session.role !== "constituency_admin" && target.parent_account_id !== session.id)) {
    return { error: "You can only manage accounts you created." };
  }

  const plainPassword = generateSecurePassword(12);
  await admin.auth.admin.updateUserById(accountId, { password: plainPassword });
  await admin.from("portal_accounts").update({ must_change_password: true }).eq("id", accountId);
  await admin.auth.admin.signOut(accountId);

  await logPortalAudit({
    action: "PASSWORD_REGENERATED",
    tableName: "portal_accounts",
    recordId: accountId,
    performedBy: session.id,
  });

  return { success: true, plainPassword };
}
