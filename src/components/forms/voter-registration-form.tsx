"use client";

import { useActionState } from "react";
import { submitVoterRegistration } from "@/app/actions";
import type { FormState } from "@/lib/form-state";
import { FormSuccess } from "@/components/forms/form-success";

const initial: FormState = { status: "idle" };

export function VoterRegistrationForm() {
  const [state, formAction, isPending] = useActionState(
    submitVoterRegistration,
    initial,
  );

  if (state.status === "success") {
    return (
      <div className="rounded-brand border border-border bg-surface/40 p-8">
        <FormSuccess
          title="Registration received!"
          message="Thank you. Our team will reach out to guide you through your voter card registration. Join our WhatsApp community for updates and support."
        />
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Surname" name="surname" required />
        <Field label="First name" name="first_name" required />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Middle name" name="middle_name" />
        <Field label="Mobile number" name="mobile" type="tel" required />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Email" name="email" type="email" />
        <Field
          label="NIN (11 digits)"
          name="nin"
          inputMode="numeric"
          pattern="\d{11}"
          maxLength={11}
          required
        />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="State of origin" name="state_of_origin" required />
        <Field label="Place of birth" name="place_of_birth" required />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="State of residence" name="state_of_residence" required />
        <Field
          label="Local government of residence"
          name="lga_of_residence"
          required
        />
      </div>
      <Field label="Residential address" name="residential_address" required />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Ward" name="ward" required />
        <Field label="Polling unit" name="polling_unit" required />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-brand bg-primary px-6 py-3.5 text-base font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
      >
        {isPending ? "Submitting…" : "Submit registration"}
      </button>
      {state.status === "error" && state.message && (
        <p className="text-sm text-primary">{state.message}</p>
      )}
      <p className="text-xs leading-relaxed text-text-muted/70">
        Your details are kept private and used only to assist with your voter card
        registration. We never share your NIN.
      </p>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  inputMode,
  pattern,
  maxLength,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  inputMode?: "numeric" | "text" | "tel";
  pattern?: string;
  maxLength?: number;
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
        inputMode={inputMode}
        pattern={pattern}
        maxLength={maxLength}
        className="mt-2 w-full rounded-brand border border-border bg-bg px-4 py-3 text-sm text-text focus:border-accent focus:outline-none"
      />
    </label>
  );
}
