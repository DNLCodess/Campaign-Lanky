import { requirePortalRole } from "@/lib/portal/session";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getActiveElection } from "@/app/portal/actions/results";
import { getElectionAggregate } from "@/lib/portal/results-aggregate";
import { LeaderboardBars } from "@/components/charts/leaderboard-bars";
import { Meter } from "@/components/charts/meter";

export const dynamic = "force-dynamic";

async function getAgentCount() {
  const admin = createAdminSupabase();
  const { count } = await admin
    .from("portal_accounts")
    .select("*", { count: "exact", head: true })
    .eq("role", "pu_agent")
    .eq("is_active", true);
  return count ?? 0;
}

export default async function AdminOverviewPage() {
  await requirePortalRole(["constituency_admin"]);
  const election = await getActiveElection();
  const [totalAgents, aggregate] = await Promise.all([
    getAgentCount(),
    election ? getElectionAggregate(election.id) : Promise.resolve(null),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="font-heading text-2xl text-text">Overview</h1>
        <p className="mt-1 text-sm text-text-muted">
          {election ? `Active election: ${election.name}` : "No active election yet — set one up under Election."}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Polling units" value={aggregate?.totalPus ?? 0} />
        <StatCard label="Active PU agents" value={totalAgents} />
        <StatCard label="Results submitted" value={aggregate?.reportingPus ?? 0} />
      </div>

      {aggregate && aggregate.reportingPus > 0 && (
        <div>
          <h2 className="font-heading text-lg text-text">Standings</h2>
          <p className="mt-1 text-sm text-text-muted">
            Constituency-wide, from {aggregate.reportingPus} of {aggregate.totalPus} polling units so far.
          </p>
          <div className="mt-4 rounded-brand border border-border bg-surface/40 p-5">
            <LeaderboardBars
              items={aggregate.totals.map((t) => ({
                id: t.id,
                label: t.name,
                sublabel: t.party ?? undefined,
                value: t.votes,
                colorIndex: t.colorIndex,
              }))}
            />
          </div>
        </div>
      )}

      <div>
        <h2 className="font-heading text-lg text-text">Submission coverage by LGA</h2>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {(aggregate?.byLga ?? []).map((row) => (
            <div key={row.lga} className="rounded-brand border border-border bg-surface/40 p-5">
              <Meter value={row.reportingPus} max={row.totalPus} label={row.lga} />
            </div>
          ))}
          {!aggregate && (
            <p className="text-sm text-text-muted sm:col-span-2">No active election yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-brand border border-border bg-surface/40 p-5">
      <p className="text-xs uppercase tracking-wide text-text-muted">{label}</p>
      <p className="mt-2 font-heading text-3xl text-text">{value}</p>
    </div>
  );
}
