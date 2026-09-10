"use client";

import { useActionState, useMemo, useState } from "react";
import { createPortalAccount, type AccountActionState } from "@/app/portal/actions/accounts";
import {
  FieldSection,
  TextField,
  SelectField,
  RadioCardGroup,
  FormBanner,
  SubmitButton,
  CredentialHandoff,
} from "@/app/portal/_components/form";

const initial: AccountActionState = {};

type GeoRow = { lga: string; ward: number; pu_code: string; pu_name: string };
type Role = "lga_coordinator" | "ward_agent" | "pu_agent";

const ROLE_OPTIONS = [
  {
    value: "lga_coordinator",
    label: "LGA Coordinator",
    description: "Oversees every ward in one local government area.",
  },
  {
    value: "ward_agent",
    label: "Ward Agent",
    description: "Oversees the polling units in a single ward.",
  },
  {
    value: "pu_agent",
    label: "Polling Unit Agent",
    description: "Submits results from one polling unit on election day.",
  },
];

/** Outer wrapper: bumping `key` on the inner form remounts it, clearing every
 *  field and the action state, so "Add another person" is a clean slate. */
export function AdminAccountForm({ geo }: { geo: GeoRow[] }) {
  const [instance, setInstance] = useState(0);
  return <AccountForm key={instance} geo={geo} onReset={() => setInstance((n) => n + 1)} />;
}

function AccountForm({ geo, onReset }: { geo: GeoRow[]; onReset: () => void }) {
  const [state, formAction, isPending] = useActionState(createPortalAccount, initial);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("lga_coordinator");
  const [lga, setLga] = useState("");
  const [ward, setWard] = useState("");
  const [pollingUnit, setPollingUnit] = useState("");

  const needsWard = role === "ward_agent" || role === "pu_agent";
  const needsPu = role === "pu_agent";

  const lgas = useMemo(() => Array.from(new Set(geo.map((g) => g.lga))), [geo]);
  const wards = useMemo(
    () =>
      Array.from(new Set(geo.filter((g) => g.lga === lga).map((g) => g.ward))).sort((a, b) => a - b),
    [geo, lga],
  );
  const pollingUnits = useMemo(
    () => geo.filter((g) => g.lga === lga && g.ward === Number(ward)),
    [geo, lga, ward],
  );

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
        <h2 className="font-heading text-lg text-text">Add a team member</h2>
        <p className="mt-1 text-sm text-text-muted">
          Create a sign-in for someone on the campaign team.
        </p>
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

      <FieldSection step={2} title="What will they do?">
        <RadioCardGroup
          name="target_role"
          legend="Role"
          value={role}
          onChange={(v) => {
            setRole(v as Role);
            setLga("");
            setWard("");
            setPollingUnit("");
          }}
          options={ROLE_OPTIONS}
        />
      </FieldSection>

      <FieldSection
        step={3}
        title="Where do they work?"
        description={
          needsPu
            ? "Choose the local government, then the ward, then the polling unit."
            : needsWard
              ? "Choose the local government, then the ward."
              : "Choose the local government area they will coordinate."
        }
      >
        <SelectField
          name="lga"
          label="Local government area"
          value={lga}
          onChange={(v) => {
            setLga(v);
            setWard("");
            setPollingUnit("");
          }}
          placeholder="Choose one"
          options={lgas.map((l) => ({ value: l, label: l }))}
        />

        {needsWard && (
          <SelectField
            name="ward"
            label="Ward"
            value={ward}
            onChange={(v) => {
              setWard(v);
              setPollingUnit("");
            }}
            placeholder="Choose a ward"
            disabledReason={lga ? undefined : "Choose a local government area first"}
            options={wards.map((w) => ({ value: String(w), label: `Ward ${w}` }))}
          />
        )}

        {needsPu && (
          <SelectField
            name="polling_unit"
            label="Polling unit"
            value={pollingUnit}
            onChange={setPollingUnit}
            placeholder="Choose a polling unit"
            disabledReason={ward ? undefined : "Choose a ward first"}
            options={pollingUnits.map((pu) => ({
              value: pu.pu_code,
              label: `${pu.pu_name} (${pu.pu_code})`,
            }))}
          />
        )}
      </FieldSection>

      <SubmitButton pending={isPending} pendingLabel="Creating account…">
        Create account
      </SubmitButton>
    </form>
  );
}
