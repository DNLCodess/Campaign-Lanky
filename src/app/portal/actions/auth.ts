"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/auth-server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { requirePortalSession, logPortalAudit } from "@/lib/portal/session";
import { ROLE_CONFIG, type PortalRole } from "@/lib/portal/constants";

export type PortalActionState = { error?: string };

export async function loginPortal(
  _prev: PortalActionState,
  formData: FormData,
): Promise<PortalActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password." };

  const supabase = await createSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (authError || !authData.user) return { error: "Invalid email or password." };

  const admin = createAdminSupabase();
  const { data: account } = await admin
    .from("portal_accounts")
    .select("id, role, is_active, must_change_password")
    .eq("id", authData.user.id)
    .single();

  if (!account || !account.is_active) {
    await supabase.auth.signOut();
    return { error: "This account is not authorised for the results portal." };
  }

  await admin
    .from("portal_accounts")
    .update({ last_login: new Date().toISOString() })
    .eq("id", account.id);

  if (account.must_change_password) redirect("/portal/change-password");
  redirect(ROLE_CONFIG[account.role as PortalRole].homePath);
}

export async function logoutPortal(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/portal/login");
}

export async function changePortalPassword(
  _prev: PortalActionState,
  formData: FormData,
): Promise<PortalActionState> {
  const session = await requirePortalSession();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  if (password !== confirm) return { error: "Passwords do not match." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: "Could not update password. Try again." };

  const admin = createAdminSupabase();
  await admin
    .from("portal_accounts")
    .update({ must_change_password: false })
    .eq("id", session.id);

  await logPortalAudit({
    action: "PASSWORD_CHANGED",
    tableName: "portal_accounts",
    recordId: session.id,
    performedBy: session.id,
  });

  redirect(ROLE_CONFIG[session.role].homePath);
}
