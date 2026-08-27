"use client";

import { useActionState } from "react";
import { changePortalPassword, type PortalActionState } from "@/app/portal/actions/auth";

const initial: PortalActionState = {};

export default function ChangePasswordPage() {
  const [state, formAction, isPending] = useActionState(changePortalPassword, initial);

  return (
    <div className="flex min-h-screen items-center justify-center px-5">
      <div className="w-full max-w-sm rounded-brand border border-border bg-surface/40 p-8">
        <h1 className="font-heading text-2xl text-text">Set a new password</h1>
        <p className="mt-1 text-sm text-text-muted">
          This account was created with a temporary password. Choose a new one to continue.
        </p>

        <form action={formAction} className="mt-6 space-y-4">
          <input
            type="password"
            name="password"
            required
            minLength={8}
            autoFocus
            autoComplete="new-password"
            placeholder="New password (min. 8 characters)"
            className="w-full rounded-brand border border-border bg-bg px-4 py-3 text-sm text-text focus:border-accent focus:outline-none"
          />
          <input
            type="password"
            name="confirm"
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="Confirm new password"
            className="w-full rounded-brand border border-border bg-bg px-4 py-3 text-sm text-text focus:border-accent focus:outline-none"
          />
          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-brand bg-primary px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
          >
            {isPending ? "Saving…" : "Save password"}
          </button>
          {state.error && <p className="text-sm text-primary">{state.error}</p>}
        </form>
      </div>
    </div>
  );
}
