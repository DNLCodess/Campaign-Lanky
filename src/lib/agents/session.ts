import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/auth-server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import type { ElectionType } from "@/lib/agents/constants";

export type AuthoritySession = {
  id: string;
  email: string;
  full_name: string;
  office: string;
  election_type: ElectionType;
  slug: string;
  is_active: boolean;
};

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

/**
 * Returns the signed-in nomination authority for this request, or null.
 * Wrapped in React `cache()` so the layout guard and the page guard in the
 * same render share one `auth.getUser()` round trip + one
 * `nomination_authorities` lookup.
 */
export const getAuthoritySession = cache(async (): Promise<AuthoritySession | null> => {
  const supabase = await createSupabaseServerClient();
  const user = await getVerifiedUser(supabase);
  if (!user) return null;

  const admin = createAdminSupabase();
  const { data: authority } = await admin
    .from("nomination_authorities")
    .select("id, email, full_name, office, election_type, slug, is_active")
    .eq("id", user.id)
    .single();

  if (!authority || !authority.is_active) return null;
  return authority as AuthoritySession;
});

/** Guard for an authority-only page — redirects to login if not signed in. */
export async function requireAuthoritySession(): Promise<AuthoritySession> {
  const session = await getAuthoritySession();
  if (!session) redirect("/agents/login");
  return session;
}

export async function logAgentAudit(entry: {
  nominationId: string;
  actor: string | null;
  action: string;
  previousValue?: unknown;
  newValue?: unknown;
}): Promise<void> {
  const admin = createAdminSupabase();
  await admin.from("agent_nomination_audit_log").insert({
    nomination_id: entry.nominationId,
    actor: entry.actor,
    action: entry.action,
    previous_value: entry.previousValue ?? null,
    new_value: entry.newValue ?? null,
  });
}
