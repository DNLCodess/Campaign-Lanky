"use client";

import { useActionState, useState } from "react";
import { createPortalAccount, type AccountActionState } from "@/app/portal/actions/accounts";
import {
  FieldSection,
  TextField,
  SelectField,
  FormBanner,
  SubmitButton,
  CredentialHandoff,
  type SelectOption,
} from "@/app/portal/_components/form";

const initial: AccountActionState = {};

/**
 * Account-creation form for the lower tiers, where the creator's own role fixes
 * the new account's role (an LGA coordinator only makes ward agents, a ward
 * agent only makes PU agents) — so there's no role step, just "who" and "which
 * ward / polling unit". Same three-part shape as the admin form.
 */
export function CreateSubAccountForm({
  heading,
  intro,
  locationStep,
  locationName,
  locationLabel,
  locationPlaceholder,
  options,
}: {
  heading: string;
  intro: string;
  locationStep: string;
  locationName: "ward" | "polling_unit";
  locationLabel: string;
  locationPlaceholder: string;
  options: SelectOption[];
}) {
  const [instance, setInstance] = useState(0);
  return (
    <Inner
      key={instance}
      heading={heading}
      intro={intro}
      locationStep={locationStep}
      locationName={locationName}
      locationLabel={locationLabel}
      locationPlaceholder={locationPlaceholder}
      options={options}
      onReset={() => setInstance((n) => n + 1)}
    />
  );
}

function Inner({
  heading,
  intro,
  locationStep,
  locationName,
  locationLabel,
  locationPlaceholder,
  options,
  onReset,
}: {
  heading: string;
  intro: string;
  locationStep: string;
  locationName: "ward" | "polling_unit";
  locationLabel: string;
  locationPlaceholder: string;
  options: SelectOption[];
  onReset: () => void;
}) {
  const [state, formAction, isPending] = useActionState(createPortalAccount, initial);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [location, setLocation] = useState("");

  if (state.success && state.plainPassword) {
    return (
      <CredentialHandoff
        name={fullName || "the new account"}
        email={email}
        password={state.plainPassword}
        onReset={onReset}
      />
    );
  }

  return (
    <form action={formAction} className="space-y-8">
      <div>
        <h2 className="font-heading text-lg text-text">{heading}</h2>
        <p className="mt-1 text-sm text-text-muted">{intro}</p>
      </div>

      {state.error && <FormBanner tone="error">{state.error}</FormBanner>}

      <FieldSection step={1} title="Who is this person?">
        <TextField
          name="full_name"
          label="Full name"
          autoFocus
          autoComplete="off"
          value={fullName}
          onChange={setFullName}
        />
        <TextField
          name="email"
          label="Email address"
          type="email"
          autoComplete="off"
          helper="They sign in with this address."
          value={email}
          onChange={setEmail}
        />
        <TextField
          name="phone"
          label="Phone number"
          type="tel"
          inputMode="tel"
          optional
          helper="Used to send airtime rewards."
        />
      </FieldSection>

      <FieldSection step={2} title={locationStep}>
        <SelectField
          name={locationName}
          label={locationLabel}
          value={location}
          onChange={setLocation}
          placeholder={locationPlaceholder}
          options={options}
        />
      </FieldSection>

      <SubmitButton pending={isPending} pendingLabel="Creating account…">
        Create account
      </SubmitButton>
    </form>
  );
}
