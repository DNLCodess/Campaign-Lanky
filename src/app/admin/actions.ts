"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/auth-server";
import { isAllowedEmail } from "@/lib/admin-auth";

export type LoginState = { error?: string };

export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { error: "Invalid email or password." };
  }

  // Enforce the admin allowlist (if configured): a valid account that isn't an
  // admin gets signed straight back out.
  if (!isAllowedEmail(email)) {
    await supabase.auth.signOut();
    return { error: "This account is not authorised for admin access." };
  }

  // `next` came from the login page's own hidden field, sourced from the
  // query string requireAdmin() built — validate again here rather than
  // trusting it, since it still passed through client-controlled form data.
  const next = String(formData.get("next") ?? "");
  const isSafeNext = next.startsWith("/admin") && next !== "/admin/login";
  redirect(isSafeNext ? next : "/admin");
}

export async function logout(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
