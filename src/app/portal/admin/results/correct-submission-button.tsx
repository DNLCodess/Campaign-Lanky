"use client";

import { useActionState, useState } from "react";
import { deleteResultSubmission, type DeleteResultState } from "@/app/portal/actions/results";

const initial: DeleteResultState = {};

/**
 * Clears one PU's submission so its agent can resubmit corrected numbers.
 * The unique constraint on election_results means there's no "edit" path —
 * this is the only way to fix a wrong entry, so it's confirm-gated.
 */
export function CorrectSubmissionButton({
  electionId,
  pollingUnit,
}: {
  electionId: string;
  pollingUnit: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [state, formAction, pending] = useActionState(deleteResultSubmission, initial);

  if (state.success) {
    return <p className="text-xs text-accent">Submission cleared — the agent can resubmit.</p>;
  }

  if (confirming) {
    return (
      <form action={formAction} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="election_id" value={electionId} />
        <input type="hidden" name="polling_unit" value={pollingUnit} />
        <span className="text-xs text-text-muted">
          Clear this submission so the agent can resubmit? This can&apos;t be undone.
        </span>
        <button
          type="submit"
          disabled={pending}
          className="rounded-brand border border-primary/50 px-3 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-60"
        >
          {pending ? "Clearing…" : "Yes, clear it"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="rounded-brand border border-border px-3 py-1 text-xs text-text-muted hover:border-accent hover:text-text"
        >
          Cancel
        </button>
        {state.error && <span className="text-xs text-primary">{state.error}</span>}
      </form>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="text-xs text-text-muted underline underline-offset-2 hover:text-primary"
    >
      Correct this submission
    </button>
  );
}
