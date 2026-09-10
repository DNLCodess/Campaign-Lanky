"use client";

import { useActionState } from "react";
import {
  createElection,
  addCandidate,
  setElectionStatus,
  setElectionPublished,
  type ElectionActionState,
} from "@/app/portal/actions/elections";
import {
  TextField,
  CheckboxField,
  FormBanner,
  SubmitButton,
} from "@/components/form";

const initial: ElectionActionState = {};

export function CreateElectionForm() {
  const [state, formAction, isPending] = useActionState(createElection, initial);
  return (
    <form action={formAction} className="max-w-md space-y-4">
      {state.error && <FormBanner tone="error">{state.error}</FormBanner>}
      <TextField
        name="name"
        label="Election name"
        helper="For example: 2027 House of Reps — Ibadan NW/SW"
      />
      <SubmitButton pending={isPending} pendingLabel="Creating…">
        Create election
      </SubmitButton>
    </form>
  );
}

export function AddCandidateForm({ electionId }: { electionId: string }) {
  const [state, formAction, isPending] = useActionState(addCandidate, initial);
  return (
    <form action={formAction} className="max-w-md space-y-4">
      <input type="hidden" name="election_id" value={electionId} />
      {state.error && <FormBanner tone="error">{state.error}</FormBanner>}
      <TextField name="name" label="Candidate name" />
      <TextField name="party" label="Party" optional />
      <CheckboxField
        name="is_incumbent"
        label="Currently holds this seat"
        helper="Marks this candidate as the incumbent."
      />
      <SubmitButton pending={isPending} pendingLabel="Adding…">
        Add candidate
      </SubmitButton>
    </form>
  );
}

export function PublishToggle({ electionId, published }: { electionId: string; published: boolean }) {
  const [state, formAction, isPending] = useActionState(setElectionPublished, initial);
  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="election_id" value={electionId} />
      <input type="hidden" name="published" value={(!published).toString()} />
      <button
        type="submit"
        disabled={isPending}
        className={`rounded-brand border px-3 py-1.5 text-xs font-medium transition-colors ${
          published
            ? "border-border text-text-muted hover:border-primary hover:text-primary"
            : "border-accent/50 text-accent hover:bg-accent/10"
        }`}
      >
        {isPending ? "Saving…" : published ? "Unpublish from public site" : "Publish to public site"}
      </button>
      {published && <span className="text-xs text-accent">Live at /results</span>}
      {state.error && <span className="text-xs text-primary">{state.error}</span>}
    </form>
  );
}

export function ElectionStatusButtons({ electionId, status }: { electionId: string; status: string }) {
  const [state, formAction, isPending] = useActionState(setElectionStatus, initial);
  const options: { value: string; label: string }[] = [
    { value: "draft", label: "Draft" },
    { value: "active", label: "Active" },
    { value: "closed", label: "Closed" },
  ];
  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="election_id" value={electionId} />
      <select
        name="status"
        defaultValue={status}
        className="rounded-brand border border-border bg-bg px-2 py-1.5 text-xs text-text focus:border-accent focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-brand border border-border px-3 py-1.5 text-xs text-text-muted transition-colors hover:border-accent hover:text-accent"
      >
        Update
      </button>
      {state.error && <span className="text-xs text-primary">{state.error}</span>}
    </form>
  );
}
