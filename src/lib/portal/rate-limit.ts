import "server-only";
import { headers } from "next/headers";
import { createAdminSupabase } from "@/lib/supabase/admin";

const WINDOW_MINUTES = 15;
const MAX_FAILURES_PER_IP = 10;

/** Best-effort client IP from the proxy chain. */
export async function getClientIp(): Promise<string> {
  const hdrs = await headers();
  const fwd = hdrs.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || hdrs.get("x-real-ip") || "unknown";
}

/**
 * True if this IP has had too many failed portal logins recently. Fail-open:
 * if the check itself errors we let the attempt through rather than lock
 * everyone out on a transient DB blip.
 */
export async function isLoginRateLimited(ip: string): Promise<boolean> {
  if (ip === "unknown") return false;
  const admin = createAdminSupabase();
  const since = new Date(Date.now() - WINDOW_MINUTES * 60_000).toISOString();
  const { count, error } = await admin
    .from("portal_login_attempts")
    .select("*", { count: "exact", head: true })
    .eq("identifier", ip)
    .eq("succeeded", false)
    .gte("created_at", since);
  if (error) return false;
  return (count ?? 0) >= MAX_FAILURES_PER_IP;
}

/** Record a login attempt. On success, also clears this IP's failure history. */
export async function recordLoginAttempt(ip: string, succeeded: boolean): Promise<void> {
  if (ip === "unknown") return;
  const admin = createAdminSupabase();
  await admin.from("portal_login_attempts").insert({ identifier: ip, succeeded });
  if (succeeded) {
    await admin.from("portal_login_attempts").delete().eq("identifier", ip).eq("succeeded", false);
  } else {
    // Opportunistic cleanup so the table doesn't grow unbounded.
    const cutoff = new Date(Date.now() - 60 * 60_000).toISOString();
    await admin.from("portal_login_attempts").delete().lt("created_at", cutoff);
  }
}
