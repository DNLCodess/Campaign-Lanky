"use client";

import { LankyMark } from "@/components/brand/lanky-mark";
import { useActionState, useRef } from "react";
import { login, type LoginState } from "@/app/admin/actions";
import { BrandWatermark } from "@/components/brand-watermark";
import { TextField, PasswordField, FormBanner, SubmitButton } from "@/components/form";

const initial: LoginState = {};

export function LoginForm({ next }: { next: string | null }) {
  const [state, formAction, isPending] = useActionState(login, initial);
  const formRef = useRef<HTMLFormElement>(null);
  const submit = () => {
    if (!isPending) formRef.current?.requestSubmit();
  };

  return (
    <div className="relative isolate flex min-h-screen flex-col items-center justify-center px-5 py-12">
      <BrandWatermark />
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center">
          <LankyMark className="h-12 w-12" title="Lanky" />
          <h1 className="mt-5 font-heading text-2xl text-text">Sign in to Campaign Admin</h1>
          <p className="mt-2 text-sm text-text-muted">Use your campaign team account.</p>
        </div>

        <div className="mt-8 rounded-brand border border-border bg-surface/60 p-6 sm:p-7">
          <form ref={formRef} action={formAction} className="space-y-4">
            {next && <input type="hidden" name="next" value={next} />}
            {state.error && <FormBanner tone="error">{state.error}</FormBanner>}
            <TextField
              name="email"
              label="Email address"
              type="email"
              autoComplete="email"
              autoFocus
              onEnter={submit}
            />
            <PasswordField
              name="password"
              label="Password"
              autoComplete="current-password"
              onEnter={submit}
            />
            <div className="pt-1">
              <SubmitButton pending={isPending} pendingLabel="Signing in…" fullWidth>
                Sign in
              </SubmitButton>
            </div>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-text-muted">
          Can’t sign in? Ask another campaign admin to check your account.
        </p>
      </div>
    </div>
  );
}
