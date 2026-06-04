"use server";

import { redirect } from "next/navigation";
import { timingSafeEqual } from "node:crypto";
import { createAdminSupabase } from "@/lib/supabase/admin";

export type SetupState = { error?: string };

function tokenMatches(input: string): boolean {
  const expected = process.env.ADMIN_SETUP_TOKEN || "";
  if (!expected) return false;
  const a = Buffer.from(input);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Create the FIRST admin account. Triple-gated:
 *  1) ADMIN_SETUP_TOKEN must be set and match,
 *  2) no users may exist yet (self-disables after the first admin),
 *  3) service-role key required.
 */
export async function createFirstAdmin(
  _prev: SetupState,
  formData: FormData,
): Promise<SetupState> {
  if (!process.env.ADMIN_SETUP_TOKEN) {
    return { error: "Setup is disabled. Set ADMIN_SETUP_TOKEN to enable it." };
  }

  const token = String(formData.get("token") ?? "");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  await new Promise((r) => setTimeout(r, 400)); // blunt brute-forcing
  if (!tokenMatches(token)) return { error: "Invalid setup token." };
  if (!email.includes("@")) return { error: "Enter a valid email address." };
  if (password.length < 8)
    return { error: "Password must be at least 8 characters." };

  try {
    const supabase = createAdminSupabase();
    const { data, error: listErr } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1,
    });
    if (listErr) throw listErr;
    if ((data?.users?.length ?? 0) > 0) {
      return {
        error: "An admin already exists. Use the login page or /admin/team.",
      };
    }

    const { error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error) return { error: error.message };
  } catch (err) {
    console.error("[createFirstAdmin]", err);
    return {
      error: "Could not create the account. Check SUPABASE_SERVICE_ROLE_KEY.",
    };
  }

  redirect("/admin/login?setup=done");
}
