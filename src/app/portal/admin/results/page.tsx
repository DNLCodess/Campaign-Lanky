import { requirePortalRole } from "@/lib/portal/session";
import { listResults } from "@/app/portal/actions/results";
import { CorrectSubmissionButton } from "@/app/portal/admin/results/correct-submission-button";

export const dynamic = "force-dynamic";

function one<T>(v: T | T[] | null): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

export default async function AdminResultsPage() {
  await requirePortalRole(["constituency_admin"]);
  const rows = await listResults();

  const groups = new Map<string, typeof rows>();
  for (const r of rows) {
    const key = `${r.election_id}::${r.polling_unit}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl text-text">Results</h1>
        <p className="mt-1 text-sm text-text-muted">
          Every submission for the active election, one card per polling unit. If an agent entered
          the wrong numbers, clear their submission below so they can resubmit — there&apos;s no
          silent overwrite by design.
        </p>
      </div>

      {groups.size === 0 && (
        <p className="rounded-brand border border-border bg-surface/40 p-5 text-sm text-text-muted">
          No results submitted yet for the active election.
        </p>
      )}

      <div className="space-y-4">
        {Array.from(groups.entries()).map(([key, group]) => {
          const first = group[0];
          const agent = one(first.portal_accounts);
          return (
            <div key={key} className="rounded-brand border border-border bg-surface/40 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-heading text-base text-text">{first.polling_unit}</p>
                  <p className="text-xs text-text-muted">
                    {first.lga} · Ward {first.ward} · submitted by {agent?.full_name ?? "—"} ·{" "}
                    {new Date(first.created_at).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                </div>
                {first.result_sheet_url && (
                  <a
                    href={first.result_sheet_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-accent underline underline-offset-2 hover:text-text"
                  >
                    View result sheet
                  </a>
                )}
              </div>

              <div className="mt-3 space-y-1.5">
                {group.map((r) => {
                  const candidate = one(r.candidates);
                  return (
                    <div key={r.id} className="flex items-center justify-between rounded-brand bg-surface-2 px-3 py-2 text-sm">
                      <span className="text-text">
                        {candidate?.name} <span className="text-text-muted">({candidate?.party || "—"})</span>
                      </span>
                      <span className="text-text">{r.votes_cast.toLocaleString()}</span>
                    </div>
                  );
                })}
              </div>

              <p className="mt-3 text-xs text-text-muted">
                Accredited {first.accredited_voters.toLocaleString()} / registered{" "}
                {first.registered_voters.toLocaleString()}
              </p>

              <div className="mt-4 border-t border-border/60 pt-3">
                <CorrectSubmissionButton electionId={first.election_id} pollingUnit={first.polling_unit} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
