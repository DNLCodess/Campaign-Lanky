"use client";

import { useActionState } from "react";
import { loginPortal, type PortalActionState } from "@/app/portal/actions/auth";

const initial: PortalActionState = {};

export default function PortalLoginPage() {
  const [state, formAction, isPending] = useActionState(loginPortal, initial);

  return (
    <div className="flex min-h-screen items-center justify-center px-5">
      <div className="w-full max-w-sm rounded-brand border border-border bg-surface/40 p-8">
        <p className="text-xs font-medium uppercase tracking-wide text-accent">
          Ibadan NW/SW Federal Constituency
        </p>
        <h1 className="mt-2 font-heading text-2xl text-text">Results Portal</h1>
        <p className="mt-1 text-sm text-text-muted">
          Sign in with your polling unit, ward, LGA, or admin account.
        </p>

        <form action={formAction} className="mt-6 space-y-4">
          <input
            type="email"
            name="email"
            required
            autoFocus
            autoComplete="email"
            placeholder="Email"
            className="w-full rounded-brand border border-border bg-bg px-4 py-3 text-sm text-text focus:border-accent focus:outline-none"
          />
          <input
            type="password"
            name="password"
            required
            autoComplete="current-password"
            placeholder="Password"
            className="w-full rounded-brand border border-border bg-bg px-4 py-3 text-sm text-text focus:border-accent focus:outline-none"
          />
          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-brand bg-primary px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
          >
            {isPending ? "Signing in…" : "Sign in"}
          </button>
          {state.error && <p className="text-sm text-primary">{state.error}</p>}
        </form>
      </div>
    </div>
  );
}
