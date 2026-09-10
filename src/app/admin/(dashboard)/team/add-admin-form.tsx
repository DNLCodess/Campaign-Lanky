"use client";

import { useActionState } from "react";
import { createAdmin, type TeamState } from "@/app/admin/(dashboard)/team/actions";
import { TextField, FormBanner, SubmitButton } from "@/components/form";

const initial: TeamState = {};

export function AddAdminForm() {
  const [state, formAction, isPending] = useActionState(createAdmin, initial);

  return (
    <form action={formAction} className="max-w-md space-y-4">
      {state.error && <FormBanner tone="error">{state.error}</FormBanner>}
      {state.warning && <FormBanner tone="error">⚠ {state.warning}</FormBanner>}
      {state.success && <FormBanner tone="info">{state.success}</FormBanner>}
      <TextField name="email" label="Email address" type="email" autoComplete="off" />
      <TextField
        name="password"
        label="Temporary password"
        helper="At least 8 characters. Share it with them privately; they can change it after signing in."
        autoComplete="off"
      />
      <SubmitButton pending={isPending} pendingLabel="Adding…">
        Add admin
      </SubmitButton>
    </form>
  );
}
