"use client";

import { useActionState } from "react";
import { createConstituencyAdmin, type CreateAdminState } from "./actions";
import {
  TextField,
  PasswordField,
  CheckboxField,
  FormBanner,
  SubmitButton,
} from "@/app/portal/_components/form";

const initial: CreateAdminState = {};

export default function CreateConstituencyAdminPage() {
  const [state, formAction, isPending] = useActionState(createConstituencyAdmin, initial);

  return (
    <div className="flex min-h-screen items-center justify-center px-5 py-16">
      <div className="w-full max-w-md rounded-brand border border-border bg-surface/40 p-8">
        <p className="text-xs font-medium uppercase tracking-wide text-accent">Dev tool</p>
        <h1 className="mt-2 font-heading text-2xl text-text">Create a constituency admin</h1>
        <p className="mt-1 text-sm text-text-muted">
          Needs the setup token. No existing portal login required; can be run more than once.
        </p>

        <form action={formAction} className="mt-6 space-y-4">
          {state.error && <FormBanner tone="error">{state.error}</FormBanner>}
          <PasswordField
            name="token"
            label="Setup token"
            autoComplete="off"
          />
          <TextField name="full_name" label="Full name" autoComplete="off" />
          <TextField name="email" label="Email address" type="email" autoComplete="off" />
          <PasswordField
            name="password"
            label="Password"
            helper="At least 8 characters, with mixed case and a number."
            autoComplete="new-password"
            minLength={8}
          />
          <CheckboxField
            name="force_password_change"
            defaultChecked
            label="Ask them to set their own password on first sign-in"
          />
          <SubmitButton pending={isPending} pendingLabel="Creating…" fullWidth>
            Create admin
          </SubmitButton>
          {state.success && <FormBanner tone="info">{state.success}</FormBanner>}
        </form>
      </div>
    </div>
  );
}
