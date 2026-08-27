"use client";

import { useActionState } from "react";
import { submitElectionResult, type ResultActionState } from "@/app/portal/actions/results";

const initial: ResultActionState = {};

type Candidate = { id: string; name: string; party: string | null };

export function SubmitResultForm({ electionId, candidates }: { electionId: string; candidates: Candidate[] }) {
  const [state, formAction, isPending] = useActionState(submitElectionResult, initial);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="election_id" value={electionId} />

      <div className="space-y-3">
        <p className="text-sm font-medium text-text">Votes per candidate</p>
        {candidates.map((c) => (
          <div key={c.id} className="flex items-center gap-3">
            <label className="w-48 text-sm text-text-muted">
              {c.name} {c.party && <span className="text-xs">({c.party})</span>}
            </label>
            <input
              type="number"
              name={`votes_${c.id}`}
              min="0"
              required
              className="w-32 rounded-brand border border-border bg-bg px-3 py-2 text-sm text-text focus:border-accent focus:outline-none"
            />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block text-sm text-text-muted">
          Accredited voters
          <input
            type="number"
            name="accredited_voters"
            min="0"
            required
            className="mt-1 w-full rounded-brand border border-border bg-bg px-3 py-2 text-sm text-text focus:border-accent focus:outline-none"
          />
        </label>
        <label className="block text-sm text-text-muted">
          Registered voters
          <input
            type="number"
            name="registered_voters"
            min="0"
            required
            className="mt-1 w-full rounded-brand border border-border bg-bg px-3 py-2 text-sm text-text focus:border-accent focus:outline-none"
          />
        </label>
      </div>

      <label className="block text-sm text-text-muted">
        Photo of the result sheet (JPEG/PNG, max 10MB)
        <input
          type="file"
          name="photo"
          accept="image/jpeg,image/png"
          required
          className="mt-1 w-full rounded-brand border border-border bg-bg px-3 py-2 text-sm text-text file:mr-3 file:rounded-brand file:border-0 file:bg-surface-2 file:px-3 file:py-1.5 file:text-text focus:border-accent focus:outline-none"
        />
      </label>

      <label className="block text-sm text-text-muted">
        Notes (optional)
        <textarea
          name="notes"
          rows={2}
          className="mt-1 w-full rounded-brand border border-border bg-bg px-3 py-2 text-sm text-text focus:border-accent focus:outline-none"
        />
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-brand bg-primary px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
      >
        {isPending ? "Submitting…" : "Submit result"}
      </button>
      {state.error && <p className="text-sm text-primary">{state.error}</p>}
      {state.success && <p className="text-sm text-accent">Result submitted — reward claimed and pending review.</p>}
    </form>
  );
}
