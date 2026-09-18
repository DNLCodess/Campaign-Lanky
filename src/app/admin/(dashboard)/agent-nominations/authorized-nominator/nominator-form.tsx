"use client";

import { useActionState } from "react";
import {
  setAuthorizedNominator,
  type NominatorActionState,
} from "@/app/admin/(dashboard)/agent-nominations/authorized-nominator/actions";
import { FieldSection, TextField, FileField, FormBanner, SubmitButton } from "@/components/form";

const initial: NominatorActionState = {};

export function NominatorForm({ currentName }: { currentName?: string }) {
  const [state, formAction, isPending] = useActionState(setAuthorizedNominator, initial);

  return (
    <form action={formAction} className="space-y-6">
      {state.error && <FormBanner tone="error">{state.error}</FormBanner>}
      {state.success && <FormBanner tone="info">{state.success}</FormBanner>}
      <FieldSection step={1} title="Authorised Nominator">
        <TextField name="full_name" label="Full name" autoComplete="name" defaultValue={currentName} />
        <FileField
          name="signature"
          label="Signature PNG"
          accept="image/png"
          optional
          helper={currentName ? "Leave blank to keep the current signature" : undefined}
        />
      </FieldSection>
      <SubmitButton pending={isPending} pendingLabel="Saving…">
        Save
      </SubmitButton>
    </form>
  );
}
