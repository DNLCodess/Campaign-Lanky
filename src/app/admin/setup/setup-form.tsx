"use client";

import { useActionState } from "react";
import { createFirstAdmin, type SetupState } from "@/app/admin/setup/actions";
import { TextField, PasswordField, FormBanner, SubmitButton } from "@/components/form";

const initial: SetupState = {};

export function SetupForm() {
  const [state, formAction, isPending] = useActionState(createFirstAdmin, initial);

  return (
    <form action={formAction} className="mt-6 space-y-4">
      {state.error && <FormBanner tone="error">{state.error}</FormBanner>}
      <TextField name="email" label="Admin email" type="email" autoComplete="off" />
      <PasswordField
        name="password"
        label="Password"
        helper="At least 8 characters."
        autoComplete="new-password"
        minLength={8}
      />
      <PasswordField name="token" label="Setup token" helper="The value of ADMIN_SETUP_TOKEN." autoComplete="off" />
      <SubmitButton pending={isPending} pendingLabel="Creating…" fullWidth>
        Create first admin
      </SubmitButton>
    </form>
  );
}
