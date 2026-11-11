"use client";

import { useActionState, useState } from "react";
import {
  updateCandidateArea,
  type AreaActionState,
} from "@/app/admin/(dashboard)/agent-nominations/candidates/actions";
import type { ConstituencyOption } from "@/lib/agents/geo";
import { SelectField, FormBanner, SubmitButton } from "@/components/form";

const initial: AreaActionState = {};

/** Change the constituency a candidate's agents come from; existing nominations are re-checked on save. */
export function AreaForm({
  candidateId,
  candidateName,
  currentId,
  options,
  onDone,
}: {
  candidateId: string;
  candidateName: string;
  currentId: number | null;
  options: ConstituencyOption[];
  onDone: () => void;
}) {
  const [state, formAction, isPending] = useActionState(updateCandidateArea, initial);
  const [value, setValue] = useState(currentId === null ? "" : String(currentId));

  if (state.success) {
    return (
      <div className="space-y-4">
        <FormBanner tone="info">{state.success}</FormBanner>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onDone}
            className="rounded-brand bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-hover"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      {state.error && <FormBanner tone="error">{state.error}</FormBanner>}
      <input type="hidden" name="candidate_id" value={candidateId} />
      <SelectField
        name="constituency_id"
        label={`Constituency for ${candidateName}`}
        value={value}
        onChange={setValue}
        options={options.map((o) => ({ value: String(o.id), label: o.label }))}
        placeholder="Select a constituency"
        helper="Their agents will only see polling units in this constituency. Existing nominations outside it get an “Outside area” flag; changing it again re-checks them."
      />
      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onDone}
          className="rounded-brand px-4 py-2.5 text-sm text-text-muted hover:text-text"
        >
          Cancel
        </button>
        <SubmitButton pending={isPending} pendingLabel="Saving…">
          Save constituency
        </SubmitButton>
      </div>
    </form>
  );
}
