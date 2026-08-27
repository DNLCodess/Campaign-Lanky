import { requirePortalRole } from "@/lib/portal/session";
import { getActiveElection, getMySubmission } from "@/app/portal/actions/results";
import { getMyReward } from "@/app/portal/actions/rewards";
import { SubmitResultForm } from "@/app/portal/pu/submit-result-form";

export const dynamic = "force-dynamic";

const REWARD_LABEL: Record<string, string> = {
  pending: "Pending review",
  approved: "Approved — awaiting payout",
  sent: "Sent",
};

export default async function PuSubmitPage() {
  const session = await requirePortalRole(["pu_agent"]);
  const election = await getActiveElection();

  if (!election) {
    return (
      <div className="mx-auto max-w-lg rounded-brand border border-border bg-surface/40 p-6 text-center">
        <p className="text-text-muted">No election is currently active. Check back once your coordinator opens it.</p>
      </div>
    );
  }

  const submission = await getMySubmission(election.id);

  if (submission) {
    const reward = await getMyReward(election.id);
    return (
      <div className="mx-auto max-w-lg space-y-5">
        <div className="rounded-brand border border-accent/40 bg-accent/10 p-6">
          <h1 className="font-heading text-xl text-text">Result submitted</h1>
          <p className="mt-1 text-sm text-text-muted">
            Your result for {session.polling_unit} has been recorded for {election.name}.
          </p>
        </div>
        <div className="rounded-brand border border-border bg-surface/40 p-6">
          <p className="text-xs uppercase tracking-wide text-text-muted">Reward status</p>
          <p className="mt-1 font-heading text-lg text-text">
            {reward ? REWARD_LABEL[reward.status] : "Not yet claimed"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="font-heading text-2xl text-text">Submit result — {session.polling_unit}</h1>
        <p className="mt-1 text-sm text-text-muted">{election.name}</p>
      </div>
      <SubmitResultForm electionId={election.id} candidates={election.candidates ?? []} />
    </div>
  );
}
