"use client";

import { useActionState, useState } from "react";
import {
  createElection,
  addCandidate,
  updateElection,
  deleteElection,
  updateCandidate,
  removeCandidate,
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

/** Election name, inline-editable, with delete (draft elections with no results only). */
export function ElectionHeader({
  electionId,
  name,
  status,
}: {
  electionId: string;
  name: string;
  status: string;
}) {
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [renameState, renameAction, renamePending] = useActionState(updateElection, initial);
  const [deleteState, deleteAction, deletePending] = useActionState(deleteElection, initial);

  if (renameState.success && editing) setEditing(false);

  if (editing) {
    return (
      <form action={renameAction} className="max-w-sm space-y-3">
        <input type="hidden" name="election_id" value={electionId} />
        {renameState.error && <FormBanner tone="error">{renameState.error}</FormBanner>}
        <TextField name="name" label="Election name" />
        <div className="flex items-center gap-2">
          <SubmitButton pending={renamePending} pendingLabel="Saving…">
            Save name
          </SubmitButton>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="rounded-brand border border-border px-4 py-2.5 text-sm text-text-muted transition-colors hover:border-accent hover:text-text"
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-heading text-lg text-text">{name}</h2>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-xs text-text-muted underline underline-offset-2 hover:text-accent"
        >
          Rename
        </button>
      </div>
      <p className="text-xs uppercase tracking-wide text-text-muted">{status}</p>

      {status === "draft" &&
        (confirmingDelete ? (
          <form action={deleteAction} className="mt-2 flex flex-wrap items-center gap-2">
            <input type="hidden" name="election_id" value={electionId} />
            <span className="text-xs text-text-muted">Delete this election? This can&apos;t be undone.</span>
            <button
              type="submit"
              disabled={deletePending}
              className="rounded-brand border border-primary/50 px-3 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-60"
            >
              {deletePending ? "Deleting…" : "Yes, delete"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              className="rounded-brand border border-border px-3 py-1 text-xs text-text-muted hover:border-accent hover:text-text"
            >
              Cancel
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="mt-2 text-xs text-text-muted underline underline-offset-2 hover:text-primary"
          >
            Delete election
          </button>
        ))}
      {deleteState.error && <p className="mt-2 text-xs text-primary">{deleteState.error}</p>}
    </div>
  );
}

/** One candidate row: static view, or inline edit, or a remove confirmation. */
export function CandidateRow({
  candidate,
}: {
  candidate: { id: string; name: string; party: string | null; is_incumbent: boolean };
}) {
  const [mode, setMode] = useState<"view" | "edit" | "remove">("view");
  const [editState, editAction, editPending] = useActionState(updateCandidate, initial);
  const [removeState, removeAction, removePending] = useActionState(removeCandidate, initial);

  if (editState.success && mode === "edit") setMode("view");

  if (mode === "edit") {
    return (
      <div className="rounded-brand bg-surface-2 px-3 py-3">
        <form action={editAction} className="space-y-3">
          <input type="hidden" name="candidate_id" value={candidate.id} />
          {editState.error && <FormBanner tone="error">{editState.error}</FormBanner>}
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField name="name" label="Candidate name" />
            <TextField name="party" label="Party" optional />
          </div>
          <CheckboxField name="is_incumbent" label="Currently holds this seat" />
          <div className="flex items-center gap-2">
            <SubmitButton pending={editPending} pendingLabel="Saving…">
              Save
            </SubmitButton>
            <button
              type="button"
              onClick={() => setMode("view")}
              className="rounded-brand border border-border px-4 py-2.5 text-sm text-text-muted transition-colors hover:border-accent hover:text-text"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    );
  }

  if (mode === "remove") {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-brand bg-surface-2 px-3 py-2 text-sm">
        <span className="text-text-muted">Remove {candidate.name}? This can&apos;t be undone.</span>
        <form action={removeAction} className="flex items-center gap-2">
          <input type="hidden" name="candidate_id" value={candidate.id} />
          <button
            type="submit"
            disabled={removePending}
            className="rounded-brand border border-primary/50 px-3 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-60"
          >
            {removePending ? "Removing…" : "Yes, remove"}
          </button>
          <button
            type="button"
            onClick={() => setMode("view")}
            className="rounded-brand border border-border px-3 py-1 text-xs text-text-muted hover:border-accent hover:text-text"
          >
            Cancel
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between rounded-brand bg-surface-2 px-3 py-2 text-sm">
        <span className="text-text">
          {candidate.name} {candidate.is_incumbent && <span className="text-accent">(incumbent)</span>}
        </span>
        <div className="flex items-center gap-3">
          <span className="text-text-muted">{candidate.party || "—"}</span>
          <button
            type="button"
            onClick={() => setMode("edit")}
            className="text-xs text-text-muted underline underline-offset-2 hover:text-accent"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => setMode("remove")}
            className="text-xs text-text-muted underline underline-offset-2 hover:text-primary"
          >
            Remove
          </button>
        </div>
      </div>
      {removeState.error && <p className="text-xs text-primary">{removeState.error}</p>}
    </div>
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
