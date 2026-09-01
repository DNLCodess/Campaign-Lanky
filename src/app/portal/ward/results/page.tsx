import { requirePortalRole } from "@/lib/portal/session";
import { listResults, getActiveElection } from "@/app/portal/actions/results";
import { getElectionAggregate } from "@/lib/portal/results-aggregate";
import { ResultsTable } from "@/app/portal/_components/results-table";
import { LeaderboardBars } from "@/components/charts/leaderboard-bars";

export const dynamic = "force-dynamic";

export default async function WardResultsPage() {
  const session = await requirePortalRole(["ward_agent"]);
  const election = await getActiveElection();
  const [rows, aggregate] = await Promise.all([
    listResults(),
    election ? getElectionAggregate(election.id) : Promise.resolve(null),
  ]);
  const wardBreakdown = aggregate?.byWard.find((b) => b.lga === session.lga && b.ward === session.ward);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl text-text">
          Results — {session.lga}, Ward {session.ward}
        </h1>
        <p className="mt-1 text-sm text-text-muted">All submissions from polling units in your ward.</p>
      </div>

      {wardBreakdown && wardBreakdown.reportingPus > 0 && (
        <div className="rounded-brand border border-border bg-surface/40 p-5">
          <p className="text-xs uppercase tracking-wide text-text-muted">
            {wardBreakdown.reportingPus}/{wardBreakdown.totalPus} PUs reporting
          </p>
          <div className="mt-3">
            <LeaderboardBars
              items={wardBreakdown.candidates.map((c) => ({
                id: c.id,
                label: c.name,
                sublabel: c.party ?? undefined,
                value: c.votes,
                colorIndex: c.colorIndex,
              }))}
            />
          </div>
        </div>
      )}

      <ResultsTable rows={rows} />
    </div>
  );
}
