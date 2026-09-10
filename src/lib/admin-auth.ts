import "server-only";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/auth-server";
import { createAdminSupabase } from "@/lib/supabase/admin";

/**
 * Admin access via Supabase Auth. Sign-ups should be disabled in Supabase, so
 * only invited team members have accounts. An optional ADMIN_EMAILS allowlist
 * (comma-separated) further restricts who counts as an admin.
 */
export function allowedEmails(): string[] {
  return (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isAllowedEmail(email: string | null | undefined): boolean {
  const allow = allowedEmails();
  if (allow.length === 0) return true; // no allowlist → any authenticated user
  return allow.includes((email ?? "").toLowerCase());
}

/**
 * True if this auth user is an election-portal account (constituency_admin,
 * lga_coordinator, ward_agent, pu_agent). The portal and the campaign site
 * share one Supabase project, so a valid portal session is also a valid
 * Supabase session — this check keeps portal accounts out of the campaign
 * `/admin` dashboard regardless of the ADMIN_EMAILS allowlist.
 */
async function isPortalAccount(userId: string): Promise<boolean> {
  try {
    const admin = createAdminSupabase();
    const { data } = await admin
      .from("portal_accounts")
      .select("id")
      .eq("id", userId)
      .maybeSingle();
    return Boolean(data);
  } catch {
    // Fail closed: if we can't confirm, don't grant campaign-admin access.
    return true;
  }
}

/** Returns the signed-in admin user, or null. */
export async function getAdminUser(): Promise<User | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAllowedEmail(user.email)) return null;
  if (await isPortalAccount(user.id)) return null;
  return user;
}

/** Guard for protected admin pages — redirects to login when not an admin. */
export async function requireAdmin(): Promise<User> {
  const user = await getAdminUser();
  if (!user) redirect("/admin/login");
  return user;
}
