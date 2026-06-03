"use client";

import { useActionState } from "react";
import { submitVolunteer } from "@/app/actions";
import type { FormState } from "@/lib/form-state";
import { FormSuccess } from "@/components/forms/form-success";

const initial: FormState = { status: "idle" };

const categories = [
  "Door-to-door canvassing",
  "Social media advocacy",
  "Polling unit agent",
  "Event planning",
];

export function VolunteerForm() {
  const [state, formAction, isPending] = useActionState(
    submitVolunteer,
    initial,
  );

  if (state.status === "success") {
    return (
      <div className="rounded-brand border border-border bg-surface/40 p-8">
        <FormSuccess
          title="Thank you for stepping up!"
          message="Your sign-up is in. The campaign team will reach out about how you can help. In the meantime, join the conversation."
        />
      </div>
    );
  }

  return (
    <form action={formAction} className="mt-8 space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Full name" name="name" required />
        <Field label="Phone (WhatsApp)" name="phone" type="tel" required />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Email" name="email" type="email" />
        <Field label="Ward / area" name="ward" />
      </div>

      <fieldset>
        <legend className="text-sm font-medium text-text">
          How would you like to help?
        </legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {categories.map((c) => (
            <label
              key={c}
              className="flex cursor-pointer items-center gap-3 rounded-brand border border-border bg-surface/40 px-4 py-3 text-sm text-text-muted transition-colors hover:border-accent/60"
            >
              <input
                type="checkbox"
                name="interests"
                value={c}
                className="h-4 w-4 accent-primary"
              />
              {c}
            </label>
          ))}
        </div>
      </fieldset>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-brand bg-primary px-6 py-3.5 text-base font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
      >
        {isPending ? "Signing you up…" : "Sign Me Up"}
      </button>
      {state.status === "error" && (
        <p className="text-sm text-primary">{state.message}</p>
      )}
      <p className="text-xs text-text-muted/70">
        By signing up you agree to be contacted by the campaign about volunteering
        opportunities.
      </p>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-text">
        {label}
        {required && <span className="text-primary"> *</span>}
      </span>
      <input
        type={type}
        name={name}
        required={required}
        className="mt-2 w-full rounded-brand border border-border bg-bg px-4 py-3 text-sm text-text placeholder:text-text-muted/60 focus:border-accent focus:outline-none"
      />
    </label>
  );
}
