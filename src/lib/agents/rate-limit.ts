import "server-only";
import { headers } from "next/headers";
import { createAdminSupabase } from "@/lib/supabase/admin";

const WINDOW_MINUTES = 15;
const MAX_FAILURES_PER_IP = 10;
const MAX_FAILURES_PER_EMAIL = 5;
const CLEANUP_AFTER_MINUTES = 60;

/**
 * Client IP for throttling. In production the app runs behind Vercel's proxy,
 * which sets `x-vercel-forwarded-for` / `x-real-ip` to the real connecting
 * address and does NOT let a client forge them — so those are trusted first.
 * The leftmost `x-forwarded-for` entry is client-controlled and only used as a
 * last resort (local dev / a non-Vercel host); treat it as advisory.
 */
export async function getClientIp(): Promise<string> {
  const hdrs = await headers();
  const trusted = hdrs.get("x-vercel-forwarded-for") || hdrs.get("x-real-ip");
  if (trusted) return trusted.trim();
  const fwd = hdrs.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || "unknown";
}

function emailKey(email: string): string {
  return `email:${email.trim().toLowerCase()}`;
}
function ipKey(ip: string): string {
  return `ip:${ip}`;
}

/**
 * True if either this IP or this email address has had too many failed
 * agents-platform logins in the window. Fail-open: if the check itself
 * errors we allow the attempt rather than lock every authority out on a
 * transient DB problem — Supabase Auth's own server-side per-IP rate
 * limiting on signInWithPassword is the backstop when this layer is
 * unavailable.
 */
export async function isLoginRateLimited(ip: string, email: string): Promise<boolean> {
  const identifiers = [emailKey(email)];
  if (ip !== "unknown") identifiers.push(ipKey(ip));

  const admin = createAdminSupabase();
  const since = new Date(Date.now() - WINDOW_MINUTES * 60_000).toISOString();
  const { data, error } = await admin
    .from("agent_login_attempts")
    .select("identifier")
    .in("identifier", identifiers)
    .eq("succeeded", false)
    .gte("created_at", since);
  if (error) {
    console.error("[agents] login rate-limit check failed, allowing attempt", error);
    return false;
  }

  let ipFails = 0;
  let emailFails = 0;
  for (const row of data ?? []) {
    if (row.identifier === ipKey(ip)) ipFails++;
    else emailFails++;
  }
  return ipFails >= MAX_FAILURES_PER_IP || emailFails >= MAX_FAILURES_PER_EMAIL;
}

/**
 * Record a login attempt against both the IP and the email key. On success,
 * clears the failure history for those same keys.
 */
export async function recordLoginAttempt(ip: string, email: string, succeeded: boolean): Promise<void> {
  const admin = createAdminSupabase();
  const rows = [{ identifier: emailKey(email), succeeded }];
  if (ip !== "unknown") rows.push({ identifier: ipKey(ip), succeeded });
  await admin.from("agent_login_attempts").insert(rows);

  if (succeeded) {
    await admin
      .from("agent_login_attempts")
      .delete()
      .in("identifier", rows.map((r) => r.identifier))
      .eq("succeeded", false);
    return;
  }

  // Opportunistic cleanup so the table doesn't grow unbounded.
  const cutoff = new Date(Date.now() - CLEANUP_AFTER_MINUTES * 60_000).toISOString();
  await admin.from("agent_login_attempts").delete().lt("created_at", cutoff);
}
