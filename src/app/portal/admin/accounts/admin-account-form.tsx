"use client";

import { useActionState, useMemo, useState } from "react";
import { createPortalAccount, type AccountActionState } from "@/app/portal/actions/accounts";
import type { PortalRole } from "@/lib/portal/constants";

const initial: AccountActionState = {};

type GeoRow = { lga: string; ward: number; pu_code: string; pu_name: string };

const ROLE_LABELS: Record<Exclude<PortalRole, "constituency_admin" | "pu_agent"> | "pu_agent", string> = {
  lga_coordinator: "LGA Coordinator",
  ward_agent: "Ward Agent",
  pu_agent: "PU Agent",
};

export function AdminAccountForm({ geo }: { geo: GeoRow[] }) {
  const [state, formAction, isPending] = useActionState(createPortalAccount, initial);

  const [role, setRole] = useState<"lga_coordinator" | "ward_agent" | "pu_agent">("lga_coordinator");
  const [lga, setLga] = useState("");
  const [ward, setWard] = useState("");
  const [pollingUnit, setPollingUnit] = useState("");

  const lgas = useMemo(() => Array.from(new Set(geo.map((g) => g.lga))), [geo]);
  const wards = useMemo(
    () => Array.from(new Set(geo.filter((g) => g.lga === lga).map((g) => g.ward))).sort((a, b) => a - b),
    [geo, lga],
  );
  const pollingUnits = useMemo(
    () => geo.filter((g) => g.lga === lga && g.ward === Number(ward)),
    [geo, lga, ward],
  );

  const [handledSuccess, setHandledSuccess] = useState(false);
  if (state.success && !handledSuccess) {
    setHandledSuccess(true);
    setLga("");
    setWard("");
    setPollingUnit("");
  }
  if (!state.success && handledSuccess) setHandledSuccess(false);

  return (
    <form action={formAction} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <select
        name="target_role"
        required
        value={role}
        onChange={(e) => {
          setRole(e.target.value as typeof role);
          setLga("");
          setWard("");
          setPollingUnit("");
        }}
        className="rounded-brand border border-border bg-bg px-3 py-2 text-sm text-text focus:border-accent focus:outline-none"
      >
        {Object.entries(ROLE_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
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
        name="lga"
        required
        value={lga}
        onChange={(e) => {
          setLga(e.target.value);
          setWard("");
          setPollingUnit("");
        }}
        className="rounded-brand border border-border bg-bg px-3 py-2 text-sm text-text focus:border-accent focus:outline-none"
      >
        <option value="" disabled>
          LGA
        </option>
        {lgas.map((l) => (
          <option key={l} value={l}>
            {l}
          </option>
        ))}
      </select>

      {(role === "ward_agent" || role === "pu_agent") && (
        <select
          name="ward"
          required
          value={ward}
          disabled={!lga}
          onChange={(e) => {
            setWard(e.target.value);
            setPollingUnit("");
          }}
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
      )}

      {role === "pu_agent" && (
        <select
          name="polling_unit"
          required
          value={pollingUnit}
          disabled={!ward}
          onChange={(e) => setPollingUnit(e.target.value)}
          className="rounded-brand border border-border bg-bg px-3 py-2 text-sm text-text focus:border-accent focus:outline-none sm:col-span-2"
        >
          <option value="" disabled>
            Polling unit
          </option>
          {pollingUnits.map((pu) => (
            <option key={pu.pu_code} value={pu.pu_code}>
              {pu.pu_name} ({pu.pu_code})
            </option>
          ))}
        </select>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-brand bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
      >
        {isPending ? "Creating…" : "Add account"}
      </button>
      {state.error && <p className="col-span-full text-sm text-primary">{state.error}</p>}
      {state.plainPassword && (
        <p className="col-span-full rounded-brand bg-surface-2 px-3 py-2 text-sm text-text">
          Account created. Temporary password: <code className="font-mono">{state.plainPassword}</code> — share
          this securely; they&apos;ll be asked to change it on first login.
        </p>
      )}
    </form>
  );
}
