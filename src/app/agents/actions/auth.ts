"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/auth-server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getClientIp, isLoginRateLimited, recordLoginAttempt } from "@/lib/agents/rate-limit";
import { agentsPath } from "@/lib/agents/routes";

export type AgentActionState = { error?: string };

export async function loginCandidate(
  _prev: AgentActionState,
  formData: FormData,
): Promise<AgentActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password." };

  const ip = await getClientIp();
  if (await isLoginRateLimited(ip, email)) {
    return { error: "Too many failed attempts. Wait a few minutes and try again." };
  }

  const supabase = await createSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (authError || !authData.user) {
    await recordLoginAttempt(ip, email, false);
    return { error: "Invalid email or password." };
  }

  const admin = createAdminSupabase();
  const { data: candidate } = await admin
    .from("nomination_candidates")
    .select("id, is_active")
    .eq("id", authData.user.id)
    .single();

  if (!candidate || !candidate.is_active) {
    await supabase.auth.signOut();
    await recordLoginAttempt(ip, email, false);
    return { error: "This account is not authorised for the nomination platform." };
  }

  await recordLoginAttempt(ip, email, true);
  redirect(agentsPath("/"));
}

export async function logoutCandidate(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect(agentsPath("/login"));
}
