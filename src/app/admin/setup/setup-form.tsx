"use client";

import { useActionState } from "react";
import { createFirstAdmin, type SetupState } from "@/app/admin/setup/actions";

const initial: SetupState = {};

export function SetupForm() {
  const [state, formAction, isPending] = useActionState(createFirstAdmin, initial);

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <label className="block">
        <span className="text-sm font-medium text-text">Admin email</span>
        <input
          type="email"
          name="email"
          required
          className="mt-1.5 w-full rounded-brand border border-border bg-bg px-4 py-2.5 text-sm text-text focus:border-accent focus:outline-none"
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-text">Password</span>
        <input
          type="password"
          name="password"
          required
          minLength={8}
          placeholder="min. 8 characters"
          className="mt-1.5 w-full rounded-brand border border-border bg-bg px-4 py-2.5 text-sm text-text placeholder:text-text-muted/50 focus:border-accent focus:outline-none"
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-text">Setup token</span>
        <input
          type="password"
          name="token"
          required
          placeholder="value of ADMIN_SETUP_TOKEN"
          className="mt-1.5 w-full rounded-brand border border-border bg-bg px-4 py-2.5 text-sm text-text placeholder:text-text-muted/50 focus:border-accent focus:outline-none"
        />
      </label>
      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-brand bg-primary px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
      >
        {isPending ? "Creating…" : "Create first admin"}
      </button>
      {state.error && <p className="text-sm text-primary">{state.error}</p>}
    </form>
  );
}
