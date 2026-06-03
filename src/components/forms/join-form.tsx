"use client";

import { useActionState } from "react";
import { submitLead } from "@/app/actions";
import type { FormState } from "@/lib/form-state";
import { FormSuccess } from "@/components/forms/form-success";

const initial: FormState = { status: "idle" };

export function JoinForm() {
  const [state, formAction, isPending] = useActionState(submitLead, initial);

  if (state.status === "success") {
    return (
      <FormSuccess
        compact
        title="Welcome to the movement!"
        message="Thank you for adding your voice. We'll keep you updated on town halls, tours, and how to help."
      />
    );
  }

  return (
    <form action={formAction} className="mx-auto mt-8 max-w-md">
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="email"
          name="email"
          required
          placeholder="Email address"
          className="flex-1 rounded-brand border border-border bg-bg px-4 py-3 text-sm text-text placeholder:text-text-muted/60 focus:border-accent focus:outline-none"
        />
        <input
          type="tel"
          name="phone"
          placeholder="Phone (SMS)"
          className="flex-1 rounded-brand border border-border bg-bg px-4 py-3 text-sm text-text placeholder:text-text-muted/60 focus:border-accent focus:outline-none"
        />
        <button
          type="submit"
          disabled={isPending}
          className="rounded-brand bg-primary px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
        >
          {isPending ? "Joining…" : "Count Me In"}
        </button>
      </div>
      {state.status === "error" && (
        <p className="mt-3 text-sm text-primary">{state.message}</p>
      )}
    </form>
  );
}
