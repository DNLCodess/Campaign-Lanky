"use client";

import { useActionState, useState } from "react";
import { createAuthority, type AuthorityActionState } from "@/app/admin/(dashboard)/agent-nominations/authorities/actions";
import { ELECTION_TYPES, ELECTION_TYPE_LABELS } from "@/lib/agents/constants";
import {
  FieldSection,
  TextField,
  SelectField,
  FileField,
  FormBanner,
  SubmitButton,
  CredentialHandoff,
} from "@/components/form";

const initial: AuthorityActionState = {};

const ELECTION_TYPE_OPTIONS = ELECTION_TYPES.map((value) => ({
  value,
  label: ELECTION_TYPE_LABELS[value],
}));

export function AuthorityForm() {
  const [instance, setInstance] = useState(0);
  return <Form key={instance} onCreated={() => setInstance((n) => n + 1)} />;
}

function Form({ onCreated }: { onCreated: () => void }) {
  const [state, formAction, isPending] = useActionState(createAuthority, initial);
  const [electionType, setElectionType] = useState("");

  if (state.success && state.plainPassword && state.createdName && state.createdEmail) {
    return (
      <CredentialHandoff
        name={state.createdName}
        email={state.createdEmail}
        password={state.plainPassword}
        onReset={onCreated}
      />
    );
  }

  return (
    <form action={formAction} className="space-y-6">
      {state.error && <FormBanner tone="error">{state.error}</FormBanner>}
      <FieldSection step={1} title="Authority details">
        <TextField name="full_name" label="Full name" autoComplete="name" />
        <TextField name="email" label="Email address" type="email" autoComplete="email" />
        <TextField
          name="office"
          label="Office"
          helper="e.g. House of Representatives – Ibadan NW/SW"
        />
        <SelectField
          name="election_type"
          label="Election type"
          value={electionType}
          onChange={setElectionType}
          options={ELECTION_TYPE_OPTIONS}
          placeholder="Select an election type"
        />
        <TextField
          name="slug"
          label="Link slug (optional)"
          optional
          helper="Auto-generated from name if left blank"
        />
      </FieldSection>
      <FieldSection step={2} title="Signature">
        <FileField name="signature" label="Signature PNG" accept="image/png" />
      </FieldSection>
      <SubmitButton pending={isPending} pendingLabel="Creating…">
        Create authority
      </SubmitButton>
    </form>
  );
}
