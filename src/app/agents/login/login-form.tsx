"use client";

import { useActionState, useRef } from "react";
import { loginCandidate, type AgentActionState } from "@/app/agents/actions/auth";
import { TextField, PasswordField, FormBanner, SubmitButton } from "@/components/form";

const initial: AgentActionState = {};

export function LoginForm({ next }: { next: string | null }) {
  const [state, formAction, isPending] = useActionState(loginCandidate, initial);
  const formRef = useRef<HTMLFormElement>(null);
  const submit = () => {
    if (!isPending) formRef.current?.requestSubmit();
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm rounded-brand border border-border bg-surface/70 p-8 shadow-2xl shadow-black/40">
        <p className="text-xs font-medium uppercase tracking-wide text-accent">
          Party Agent Nominations
        </p>
        <h1 className="mt-2 font-heading text-2xl text-text">Sign in</h1>
        <p className="mt-1 text-sm text-text-muted">
          Review nominations submitted under your candidacy.
        </p>

        <form ref={formRef} action={formAction} className="mt-6 space-y-4">
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
          <SubmitButton pending={isPending} pendingLabel="Signing in…" fullWidth>
            Sign in
          </SubmitButton>
        </form>
      </div>
    </div>
  );
}
