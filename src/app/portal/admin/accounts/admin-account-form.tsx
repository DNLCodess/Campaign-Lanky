"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import {
  createPortalAccount,
  updatePortalAccount,
  type AccountActionState,
} from "@/app/portal/actions/accounts";
import { portalPath } from "@/lib/portal/routes";
import {
  FieldSection,
  TextField,
  SelectField,
  RadioCardGroup,
  FormBanner,
  SubmitButton,
  CredentialHandoff,
} from "@/components/form";

const initial: AccountActionState = {};

type GeoRow = { lga: string; ward: number; pu_code: string; pu_name: string };
type Role = "lga_coordinator" | "ward_agent" | "pu_agent";

export type EditableAccount = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: string;
  lga: string | null;
  ward: number | null;
  polling_unit: string | null;
};

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
export function AdminAccountForm({ geo, account }: { geo: GeoRow[]; account?: EditableAccount }) {
  const [instance, setInstance] = useState(0);
  return (
    <AccountForm
      key={instance}
      geo={geo}
      account={account}
      onReset={() => setInstance((n) => n + 1)}
    />
  );
}

function AccountForm({
  geo,
  account,
  onReset,
}: {
  geo: GeoRow[];
  account?: EditableAccount;
  onReset: () => void;
}) {
  const isEdit = Boolean(account);
  const [state, formAction, isPending] = useActionState(
    isEdit ? updatePortalAccount : createPortalAccount,
    initial,
  );

  const [fullName, setFullName] = useState(account?.full_name ?? "");
  const [email, setEmail] = useState(account?.email ?? "");
  const [role, setRole] = useState<Role>((account?.role as Role) ?? "lga_coordinator");
  const [lga, setLga] = useState(account?.lga ?? "");
  const [ward, setWard] = useState(account?.ward ? String(account.ward) : "");
  const [pollingUnit, setPollingUnit] = useState(account?.polling_unit ?? "");

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

  if (!isEdit && state.success && state.plainPassword) {
    return (
      <CredentialHandoff
        name={fullName || "the new account"}
        email={email}
        password={state.plainPassword}
        onReset={onReset}
      />
    );
  }

  if (isEdit && state.success) {
    return (
      <div className="space-y-4 rounded-brand border border-accent/40 bg-accent/5 p-5">
        <p className="text-sm text-text">Saved. {fullName}&apos;s account has been updated.</p>
        <Link
          href={portalPath("/admin/accounts")}
          className="inline-block rounded-brand border border-border px-4 py-2 text-sm text-text-muted transition-colors hover:border-accent hover:text-text"
        >
          Back to accounts
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-8">
      {isEdit && <input type="hidden" name="account_id" value={account!.id} />}
      <div>
        <h2 className="font-heading text-lg text-text">
          {isEdit ? `Edit ${account!.full_name}` : "Add a team member"}
        </h2>
        <p className="mt-1 text-sm text-text-muted">
          {isEdit
            ? "Change their details, role, or where they are assigned."
            : "Create a sign-in for someone on the campaign team."}
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
          defaultValue={account?.phone ?? ""}
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

      <div className="flex items-center gap-3">
        <SubmitButton
          pending={isPending}
          pendingLabel={isEdit ? "Saving…" : "Creating account…"}
        >
          {isEdit ? "Save changes" : "Create account"}
        </SubmitButton>
        {isEdit && (
          <Link
            href={portalPath("/admin/accounts")}
            className="rounded-brand border border-border px-4 py-2.5 text-sm text-text-muted transition-colors hover:border-accent hover:text-text"
          >
            Cancel
          </Link>
        )}
      </div>
    </form>
  );
}
