"use client";

import { useActionState, useRef } from "react";
import { changePortalPassword, type PortalActionState } from "@/app/portal/actions/auth";
import { PasswordField, FormBanner, SubmitButton } from "@/components/form";

const initial: PortalActionState = {};

export default function ChangePasswordPage() {
  const [state, formAction, isPending] = useActionState(changePortalPassword, initial);
  const formRef = useRef<HTMLFormElement>(null);
  const submit = () => formRef.current?.requestSubmit();

  return (
    <div className="flex min-h-screen items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm rounded-brand border border-border bg-surface/40 p-8">
        <h1 className="font-heading text-2xl text-text">Set your password</h1>
        <p className="mt-1 text-sm text-text-muted">
          Your account was created with a temporary password. Choose your own to continue.
        </p>

        <form ref={formRef} action={formAction} className="mt-6 space-y-4">
          {state.error && <FormBanner tone="error">{state.error}</FormBanner>}
          <PasswordField
            name="password"
            label="New password"
            helper="At least 8 characters."
            autoComplete="new-password"
            autoFocus
            minLength={8}
            onEnter={submit}
          />
          <PasswordField
            name="confirm"
            label="Repeat new password"
            autoComplete="new-password"
            minLength={8}
            onEnter={submit}
          />
          <SubmitButton pending={isPending} pendingLabel="Saving…" fullWidth>
            Save password
          </SubmitButton>
        </form>
      </div>
    </div>
  );
}
