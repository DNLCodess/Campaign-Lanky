"use client";

import { useActionState } from "react";
import { createPortalAccount, type AccountActionState } from "@/app/portal/actions/accounts";

const initial: AccountActionState = {};

export function WardAgentForm({ wards }: { wards: number[] }) {
  const [state, formAction, isPending] = useActionState(createPortalAccount, initial);

  return (
    <form action={formAction} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <input
        name="full_name"
        required
        placeholder="Full name"
        className="rounded-brand border border-border bg-bg px-3 py-2 text-sm text-text focus:border-accent focus:outline-none"
      />
      <input
        name="email"
        type="email"
        required
        placeholder="Email"
        className="rounded-brand border border-border bg-bg px-3 py-2 text-sm text-text focus:border-accent focus:outline-none"
      />
      <input
        name="phone"
        placeholder="Phone (optional)"
        className="rounded-brand border border-border bg-bg px-3 py-2 text-sm text-text focus:border-accent focus:outline-none"
      />
      <select
        name="ward"
        required
        defaultValue=""
        className="rounded-brand border border-border bg-bg px-3 py-2 text-sm text-text focus:border-accent focus:outline-none"
      >
        <option value="" disabled>
          Ward
        </option>
        {wards.map((w) => (
          <option key={w} value={w}>
            Ward {w}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-brand bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
      >
        {isPending ? "Creating…" : "Add ward agent"}
      </button>
      {state.error && <p className="col-span-full text-sm text-primary">{state.error}</p>}
      {state.plainPassword && (
        <p className="col-span-full rounded-brand bg-surface-2 px-3 py-2 text-sm text-text">
          Account created. Temporary password: <code className="font-mono">{state.plainPassword}</code>
        </p>
      )}
    </form>
  );
}
