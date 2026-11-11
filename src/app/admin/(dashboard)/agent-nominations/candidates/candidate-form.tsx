"use client";

import { useActionState, useState } from "react";
import { createCandidate, type CandidateActionState } from "@/app/admin/(dashboard)/agent-nominations/candidates/actions";
import { CopyButton } from "@/app/admin/(dashboard)/agent-nominations/candidates/candidate-modal";
import { agentLink } from "@/app/admin/(dashboard)/agent-nominations/candidates/agent-link";
import { ELECTION_TYPES, ELECTION_TYPE_LABELS, type ElectionType } from "@/lib/agents/constants";
import type { ConstituencyOption } from "@/lib/agents/geo";
import {
  TextField,
  SelectField,
  FormBanner,
  SubmitButton,
} from "@/components/form";

const initial: CandidateActionState = {};

const ELECTION_TYPE_OPTIONS = ELECTION_TYPES.map((value) => ({
  value,
  label: ELECTION_TYPE_LABELS[value],
}));

export type ConstituenciesByType = Record<ElectionType, ConstituencyOption[]>;

export function CandidateForm({
  onDone,
  constituencies,
}: {
  onDone: () => void;
  constituencies: ConstituenciesByType;
}) {
  const [instance, setInstance] = useState(0);
  return (
    <Form
      key={instance}
      constituencies={constituencies}
      onAnother={() => setInstance((n) => n + 1)}
      onDone={onDone}
    />
  );
}

function Form({
  onAnother,
  onDone,
  constituencies,
}: {
  onAnother: () => void;
  onDone: () => void;
  constituencies: ConstituenciesByType;
}) {
  const [state, formAction, isPending] = useActionState(createCandidate, initial);
  const [electionType, setElectionType] = useState("");
  const [constituencyId, setConstituencyId] = useState("");
  const constituencyOptions = electionType ? constituencies[electionType as ElectionType] : [];

  if (state.success && state.plainPassword && state.createdName && state.createdEmail) {
    const first = state.createdName.split(" ")[0];
    const submitLink = state.createdSlug ? agentLink(state.createdSlug) : "";
    const loginLink = agentLink("", "/login");
    const message =
      `Hello ${first}, your Party Agent nomination account is ready.\n\n` +
      `Sign in: ${loginLink}\n` +
      `Email: ${state.createdEmail}\n` +
      `Temporary password: ${state.plainPassword}\n\n` +
      (submitLink ? `Link for your agents to submit their details:\n${submitLink}` : "");

    return (
      <div className="space-y-4">
        <FormBanner tone="info">
          Account created for {state.createdName}. Send them these details privately. They
          set their own password on first sign-in.
        </FormBanner>
        <dl className="space-y-2 rounded-brand border border-border bg-surface/40 p-3.5 text-sm">
          <Row label="Email" value={state.createdEmail} />
          <Row label="Temporary password" value={state.plainPassword} mono />
          <Row label="Sign-in page" value={loginLink} />
          {submitLink && <Row label="Agents’ link" value={submitLink} />}
        </dl>
        <div className="flex flex-wrap gap-2">
          <CopyButton
            variant="solid"
            text={message}
            label="Copy message to send"
            copiedLabel="Message copied"
          />
          <button
            type="button"
            onClick={onAnother}
            className="rounded-brand border border-border px-3.5 py-2 text-sm text-text hover:border-accent"
          >
            Add another candidate
          </button>
          <button
            type="button"
            onClick={onDone}
            className="rounded-brand px-3.5 py-2 text-sm text-text-muted hover:text-text"
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
      <TextField name="full_name" label="Full name" autoComplete="off" />
      <TextField name="email" label="Email address" type="email" autoComplete="off" />
      <TextField
        name="office"
        label="Office"
        helper="e.g. House of Representatives – Ibadan NW/SW"
      />
      <SelectField
        name="election_type"
        label="Election type"
        value={electionType}
        onChange={(v) => {
          setElectionType(v);
          setConstituencyId("");
        }}
        options={ELECTION_TYPE_OPTIONS}
        placeholder="Select an election type"
      />
      {constituencyOptions.length > 0 && (
        <SelectField
          name="constituency_id"
          label="Constituency"
          value={constituencyId}
          onChange={setConstituencyId}
          options={constituencyOptions.map((o) => ({ value: String(o.id), label: o.label }))}
          placeholder="Select a constituency"
          helper="Their agents will only be able to pick polling units in this constituency."
        />
      )}
      {(electionType === "governorship" || electionType === "presidential") && (
        <p className="text-sm text-text-muted">Agents can pick any polling unit in Oyo State.</p>
      )}
      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onDone}
          className="rounded-brand px-4 py-2.5 text-sm text-text-muted hover:text-text"
        >
          Cancel
        </button>
        <SubmitButton pending={isPending} pendingLabel="Creating…">
          Create candidate
        </SubmitButton>
      </div>
    </form>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-4">
      <dt className="text-text-muted">{label}</dt>
      <dd className={`break-all text-text ${mono ? "font-mono" : ""}`}>{value}</dd>
    </div>
  );
}
