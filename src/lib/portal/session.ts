import "server-only";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/auth-server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { ROLE_CONFIG, type PortalRole } from "@/lib/portal/constants";

export type PortalSession = {
  id: string;
  email: string;
  full_name: string;
  role: PortalRole;
  lga: string | null;
  ward: number | null;
  polling_unit: string | null;
  must_change_password: boolean;
};

/**
 * `getUser()` revalidates the session against Supabase Auth over the network
 * (not just a local JWT decode) — the right call for a role/authorization
 * check, but PU agents submit from polling units on unreliable mobile data,
 * where a single dropped request must not silently look like "logged out"
 * and discard an in-progress submission. A couple of quick retries absorb
 * that without weakening the check itself.
 */
async function getVerifiedUser(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) return user;
    if (attempt < 2) await new Promise((r) => setTimeout(r, 200));
  }
  return null;
}

/** Returns the signed-in portal account for this request, or null. */
export async function getPortalSession(): Promise<PortalSession | null> {
  const supabase = await createSupabaseServerClient();
  const user = await getVerifiedUser(supabase);
  if (!user) return null;

  const admin = createAdminSupabase();
  const { data: account } = await admin
    .from("portal_accounts")
    .select("id, email, full_name, role, lga, ward, polling_unit, must_change_password, is_active")
    .eq("id", user.id)
    .single();

  if (!account || !account.is_active) return null;
  return account as PortalSession;
}

/** Guard for a portal page — redirects to login if not signed in as one of `roles`. */
export async function requirePortalRole(roles: PortalRole[]): Promise<PortalSession> {
  const session = await getPortalSession();
  if (!session) redirect("/portal/login");
  if (session.must_change_password) redirect("/portal/change-password");
  if (!roles.includes(session.role)) redirect(ROLE_CONFIG[session.role].homePath);
  return session;
}

/** Any authenticated, active portal account — used by /portal/change-password. */
export async function requirePortalSession(): Promise<PortalSession> {
  const session = await getPortalSession();
  if (!session) redirect("/portal/login");
  return session;
}

export async function logPortalAudit(entry: {
  action: string;
  tableName: string;
  recordId?: string | null;
  performedBy: string;
  notes?: string;
}): Promise<void> {
  const admin = createAdminSupabase();
  const hdrs = await headers();
  await admin.from("result_audit_log").insert({
    action: entry.action,
    table_name: entry.tableName,
    record_id: entry.recordId ?? null,
    performed_by: entry.performedBy,
    ip_address: hdrs.get("x-forwarded-for") || "unknown",
    user_agent: hdrs.get("user-agent") || "unknown",
    notes: entry.notes ?? null,
  });
}
