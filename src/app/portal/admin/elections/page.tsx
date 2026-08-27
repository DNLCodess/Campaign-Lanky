import { requirePortalRole } from "@/lib/portal/session";
import { listElections } from "@/app/portal/actions/elections";
import {
  CreateElectionForm,
  AddCandidateForm,
  ElectionStatusButtons,
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
          <div key={election.id} className="rounded-brand border border-border p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-heading text-lg text-text">{election.name}</h2>
                <p className="text-xs uppercase tracking-wide text-text-muted">{election.status}</p>
              </div>
              <ElectionStatusButtons electionId={election.id} status={election.status} />
            </div>

            <div className="mt-4 space-y-2">
              {(election.candidates ?? []).map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between rounded-brand bg-surface-2 px-3 py-2 text-sm"
                >
                  <span className="text-text">
                    {c.name} {c.is_incumbent && <span className="text-accent">(incumbent)</span>}
                  </span>
                  <span className="text-text-muted">{c.party || "—"}</span>
                </div>
              ))}
              {(election.candidates ?? []).length === 0 && (
                <p className="text-sm text-text-muted">No candidates yet.</p>
              )}
            </div>

            <div className="mt-4">
              <AddCandidateForm electionId={election.id} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
