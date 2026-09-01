import "server-only";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getElectionAggregate, type ElectionAggregate } from "@/lib/portal/results-aggregate";

export type PublicResults = ElectionAggregate & { publishedAt: string | null };

/**
 * Public-safe results — returns null unless an election has been explicitly
 * published (constituency_admin toggle in /portal/admin/elections), never
 * inferred from election.status. This is the only route this data reaches
 * the public site through; the portal's own dashboards call
 * getElectionAggregate directly since they're already access-controlled.
 */
export async function getPublicResults(): Promise<PublicResults | null> {
  const admin = createAdminSupabase();
  const { data: election } = await admin
    .from("elections")
    .select("id, results_published_at")
    .eq("published", true)
    .order("results_published_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!election) return null;

  const aggregate = await getElectionAggregate(election.id);
  if (!aggregate) return null;

  return { ...aggregate, publishedAt: election.results_published_at };
}
