"use client";

import { useActionState } from "react";
import {
  createElection,
  addCandidate,
  setElectionStatus,
  type ElectionActionState,
} from "@/app/portal/actions/elections";

const initial: ElectionActionState = {};

export function CreateElectionForm() {
  const [state, formAction, isPending] = useActionState(createElection, initial);
  return (
    <form action={formAction} className="flex flex-wrap gap-3">
      <input
        name="name"
        required
        placeholder="Election name (e.g. 2027 House of Reps — Ibadan NW/SW)"
        className="min-w-64 flex-1 rounded-brand border border-border bg-bg px-3 py-2 text-sm text-text focus:border-accent focus:outline-none"
      />
      <button
        type="submit"
        disabled={isPending}
        className="rounded-brand bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
      >
        {isPending ? "Creating…" : "Create election"}
      </button>
      {state.error && <p className="w-full text-sm text-primary">{state.error}</p>}
    </form>
  );
}

export function AddCandidateForm({ electionId }: { electionId: string }) {
  const [state, formAction, isPending] = useActionState(addCandidate, initial);
  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="election_id" value={electionId} />
      <input
        name="name"
        required
        placeholder="Candidate name"
        className="rounded-brand border border-border bg-bg px-3 py-1.5 text-sm text-text focus:border-accent focus:outline-none"
      />
      <input
        name="party"
        placeholder="Party"
        className="w-28 rounded-brand border border-border bg-bg px-3 py-1.5 text-sm text-text focus:border-accent focus:outline-none"
      />
      <label className="flex items-center gap-1.5 text-xs text-text-muted">
        <input type="checkbox" name="is_incumbent" /> Incumbent
      </label>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-brand border border-border px-3 py-1.5 text-xs text-text-muted transition-colors hover:border-accent hover:text-accent"
      >
        {isPending ? "Adding…" : "Add candidate"}
      </button>
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
