"use server";

import { timingSafeEqual } from "node:crypto";
import { createAdminSupabase } from "@/lib/supabase/admin";

export type CreateAdminState = { error?: string; success?: string };

function tokenMatches(input: string): boolean {
  const expected = process.env.PORTAL_ADMIN_SETUP_TOKEN || "";
  if (!expected) return false;
  const a = Buffer.from(input);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Creates a new constituency_admin account for the election results portal.
 * Gated by PORTAL_ADMIN_SETUP_TOKEN, not by an existing portal login — this
 * is a dev/setup tool, not something exposed to any authenticated role.
 * Unlike /admin/setup (the public site's one-time bootstrap), this does NOT
 * self-disable after the first admin exists, since more than one
 * constituency_admin may legitimately be created over time.
 */
export async function createConstituencyAdmin(
  _prev: CreateAdminState,
  formData: FormData,
): Promise<CreateAdminState> {
  if (!process.env.PORTAL_ADMIN_SETUP_TOKEN) {
    return { error: "This tool is disabled. Set PORTAL_ADMIN_SETUP_TOKEN to enable it." };
  }

  const token = String(formData.get("token") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const forcePasswordChange = formData.get("force_password_change") === "on";

  await new Promise((r) => setTimeout(r, 400)); // blunt brute-forcing the token
  if (!tokenMatches(token)) return { error: "Invalid setup token." };

  if (!fullName) return { error: "Full name is required." };
  if (!email.includes("@")) return { error: "Enter a valid email address." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
    return { error: "Password must include an uppercase letter, a lowercase letter, and a number." };
  }

  const admin = createAdminSupabase();

  const { data: authUser, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
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
    role: "constituency_admin",
    must_change_password: forcePasswordChange,
  });

  if (insertError) {
    await admin.auth.admin.deleteUser(authUser.user.id);
    if (insertError.message.includes("duplicate")) {
      return { error: "An account with this email already exists." };
    }
    return { error: "Failed to create account. Please try again." };
  }

  return { success: `Constituency admin created: ${email}` };
}
