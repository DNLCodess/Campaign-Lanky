"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, allowedEmails } from "@/lib/admin-auth";
import { createAdminSupabase } from "@/lib/supabase/admin";

export type TeamState = { error?: string; success?: string; warning?: string };

/** Create a new admin account (Supabase Admin API). Confirmed immediately so
 *  they can sign in right away with the password you set. */
export async function createAdmin(
  _prev: TeamState,
  formData: FormData,
): Promise<TeamState> {
  await requireAdmin();

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !email.includes("@")) {
    return { error: "Enter a valid email address." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  try {
    const supabase = createAdminSupabase();
    const { error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error) return { error: error.message };
    revalidatePath("/admin/team");

    // Warn if ADMIN_EMAILS is set and doesn't include this new email — the
    // account will exist in Supabase but login will be blocked until the env
    // var is updated.
    const list = allowedEmails();
    if (list.length > 0 && !list.includes(email)) {
      return {
        success: `Account created for ${email}.`,
        warning: `ADMIN_EMAILS is set but does not include ${email}. Add it to ADMIN_EMAILS and redeploy, otherwise this account cannot log in.`,
      };
    }

    return { success: `Admin account created for ${email}.` };
  } catch (err) {
    console.error("[createAdmin]", err);
    return { error: "Could not create the admin account." };
  }
}

/** Remove an admin account. Guarded so you can't delete yourself. */
export async function removeAdmin(formData: FormData): Promise<void> {
  const me = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id || id === me.id) return;

  try {
    const supabase = createAdminSupabase();
    await supabase.auth.admin.deleteUser(id);
    revalidatePath("/admin/team");
  } catch (err) {
    console.error("[removeAdmin]", err);
  }
}
