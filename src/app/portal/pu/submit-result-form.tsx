"use client";

import { useActionState } from "react";
import { submitElectionResult, type ResultActionState } from "@/app/portal/actions/results";
import {
  FieldSection,
  NumberField,
  FileField,
  TextareaField,
  FormBanner,
  SubmitButton,
} from "@/app/portal/_components/form";

const initial: ResultActionState = {};

type Candidate = { id: string; name: string; party: string | null };

export function SubmitResultForm({
  electionId,
  candidates,
}: {
  electionId: string;
  candidates: Candidate[];
}) {
  const [state, formAction, isPending] = useActionState(submitElectionResult, initial);

  return (
    <form action={formAction} className="space-y-8">
      <input type="hidden" name="election_id" value={electionId} />

      {state.error && <FormBanner tone="error">{state.error}</FormBanner>}

      <FieldSection
        step={1}
        title="Votes for each candidate"
        description="Copy the number from the result sheet exactly. Enter 0 if a candidate got no votes."
      >
        {candidates.map((c, i) => (
          <NumberField
            key={c.id}
            name={`votes_${c.id}`}
            label={c.party ? `${c.name} (${c.party})` : c.name}
            autoFocus={i === 0}
          />
        ))}
      </FieldSection>

      <FieldSection
        step={2}
        title="Voter numbers"
        description="These are printed near the top of the result sheet."
      >
        <NumberField
          name="accredited_voters"
          label="Accredited voters"
          helper="People who were checked in to vote at your polling unit."
        />
        <NumberField
          name="registered_voters"
          label="Registered voters"
          helper="Total voters registered for your polling unit."
        />
      </FieldSection>

      <FieldSection
        step={3}
        title="Photo of the result sheet"
        description="Take a clear photo showing all the numbers. This is your proof."
      >
        <FileField
          name="photo"
          label="Result sheet photo"
          accept="image/jpeg,image/png"
          helper="JPEG or PNG, up to 10MB."
        />
        <TextareaField
          name="notes"
          label="Anything the coordinator should know"
          rows={2}
          optional
        />
      </FieldSection>

      <SubmitButton pending={isPending} pendingLabel="Submitting…">
        Submit result
      </SubmitButton>

      {state.success && (
        <FormBanner tone="info">
          Result submitted. Your airtime reward is now pending review.
        </FormBanner>
      )}
    </form>
  );
}
