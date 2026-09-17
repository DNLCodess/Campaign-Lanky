import { requirePortalRole } from "@/lib/portal/session";
import { listElections } from "@/app/portal/actions/elections";
import { getElectionAggregate } from "@/lib/portal/results-aggregate";
import { LeaderboardBars } from "@/components/charts/leaderboard-bars";
import {
  CreateElectionForm,
  AddCandidateForm,
  ElectionHeader,
  CandidateRow,
  ElectionStatusButtons,
  PublishToggle,
} from "@/app/portal/admin/elections/election-forms";

export const dynamic = "force-dynamic";

export default async function AdminElectionsPage() {
  await requirePortalRole(["constituency_admin"]);
  const elections = await listElections();

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="font-heading text-2xl text-text">Election</h1>
        <p className="mt-1 text-sm text-text-muted">
          Set the race up once: create it, add candidates, then set it Active so PU agents can submit
          results.
        </p>
      </div>

      <div className="rounded-brand border border-border bg-surface/40 p-5">
        <CreateElectionForm />
      </div>

      <div className="space-y-6">
        {elections.length === 0 && <p className="text-sm text-text-muted">No elections yet.</p>}
        {elections.map((election) => (
          <ElectionCard key={election.id} election={election} />
        ))}
      </div>
    </div>
  );
}

async function ElectionCard({
  election,
}: {
  election: Awaited<ReturnType<typeof listElections>>[number];
}) {
  const aggregate = await getElectionAggregate(election.id);
  const hasVotes = aggregate && aggregate.reportingPus > 0;

  return (
    <div className="rounded-brand border border-border p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ElectionHeader electionId={election.id} name={election.name} status={election.status} />
        <div className="flex flex-wrap items-center gap-2">
          <ElectionStatusButtons electionId={election.id} status={election.status} />
          <PublishToggle electionId={election.id} published={election.published} />
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {(election.candidates ?? []).map((c) => (
          <CandidateRow key={c.id} candidate={c} />
        ))}
        {(election.candidates ?? []).length === 0 && (
          <p className="text-sm text-text-muted">No candidates yet.</p>
        )}
      </div>

      <div className="mt-4">
        <AddCandidateForm electionId={election.id} />
      </div>

      {hasVotes && aggregate && (
        <div className="mt-6 border-t border-border/60 pt-5">
          <p className="text-xs uppercase tracking-wide text-text-muted">
            Live standings ({aggregate.reportingPus}/{aggregate.totalPus} PUs reporting) — visible to you
            only until published
          </p>
          <div className="mt-3">
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
    </div>
  );
}
