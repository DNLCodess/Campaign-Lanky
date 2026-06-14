"use client";

import { useActionState } from "react";
import { createAdmin, type TeamState } from "@/app/admin/team/actions";

const initial: TeamState = {};

export function AddAdminForm() {
  const [state, formAction, isPending] = useActionState(createAdmin, initial);

  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      <label className="block">
        <span className="text-sm font-medium text-text">Email</span>
        <input
          type="email"
          name="email"
          required
          className="mt-1.5 w-full rounded-brand border border-border bg-bg px-4 py-2.5 text-sm text-text focus:border-accent focus:outline-none"
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-text">Temporary password</span>
        <input
          type="text"
          name="password"
          required
          minLength={8}
          placeholder="min. 8 characters"
          className="mt-1.5 w-full rounded-brand border border-border bg-bg px-4 py-2.5 text-sm text-text placeholder:text-text-muted/50 focus:border-accent focus:outline-none"
        />
      </label>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-brand bg-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
      >
        {isPending ? "Adding…" : "Add admin"}
      </button>
      {state.error && <p className="text-sm text-primary sm:col-span-3">{state.error}</p>}
      {state.success && (
        <p className="text-sm text-accent sm:col-span-3">{state.success}</p>
      )}
      {state.warning && (
        <p className="rounded-brand border border-yellow-500/30 bg-yellow-500/8 p-3 text-sm text-yellow-300 sm:col-span-3">
          ⚠ {state.warning}
        </p>
      )}
    </form>
  );
}
