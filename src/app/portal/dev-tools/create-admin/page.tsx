"use client";

import { useActionState } from "react";
import { createConstituencyAdmin, type CreateAdminState } from "./actions";

const initial: CreateAdminState = {};

export default function CreateConstituencyAdminPage() {
  const [state, formAction, isPending] = useActionState(createConstituencyAdmin, initial);

  return (
    <div className="flex min-h-screen items-center justify-center px-5 py-16">
      <div className="w-full max-w-md rounded-brand border border-border bg-surface/40 p-8">
        <p className="text-xs font-medium uppercase tracking-wide text-accent">Dev tool</p>
        <h1 className="mt-2 font-heading text-2xl text-text">Create a constituency admin</h1>
        <p className="mt-1 text-sm text-text-muted">
          Requires the setup token. This does not require an existing portal login and can be used
          to create more than one admin over time.
        </p>

        <form action={formAction} className="mt-6 space-y-4">
          <input
            type="password"
            name="token"
            required
            placeholder="Setup token"
            autoComplete="off"
            className="w-full rounded-brand border border-border bg-bg px-4 py-3 text-sm text-text focus:border-accent focus:outline-none"
          />
          <input
            type="text"
            name="full_name"
            required
            placeholder="Full name"
            className="w-full rounded-brand border border-border bg-bg px-4 py-3 text-sm text-text focus:border-accent focus:outline-none"
          />
          <input
            type="email"
            name="email"
            required
            placeholder="Email"
            className="w-full rounded-brand border border-border bg-bg px-4 py-3 text-sm text-text focus:border-accent focus:outline-none"
          />
          <input
            type="password"
            name="password"
            required
            minLength={8}
            placeholder="Password (min. 8 chars, mixed case + number)"
            autoComplete="new-password"
            className="w-full rounded-brand border border-border bg-bg px-4 py-3 text-sm text-text focus:border-accent focus:outline-none"
          />
          <label className="flex items-center gap-2 text-sm text-text-muted">
            <input
              type="checkbox"
              name="force_password_change"
              defaultChecked
              className="h-4 w-4 rounded border-border bg-bg accent-primary"
            />
            Force a password change on first login
          </label>
          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-brand bg-primary px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
          >
            {isPending ? "Creating…" : "Create admin"}
          </button>
          {state.error && <p className="text-sm text-primary">{state.error}</p>}
          {state.success && <p className="text-sm text-accent">{state.success}</p>}
        </form>
      </div>
    </div>
  );
}
