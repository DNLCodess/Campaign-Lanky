"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import type { TeamLeader, TeamLeaderLevel } from "@/lib/team-leaders";
import {
  createTeamLeader,
  updateTeamLeader,
  searchPortalAccounts,
  getPortalAccountById,
  type LeaderState,
  type PortalAccountMatch,
} from "@/app/admin/(dashboard)/team-leaders/actions";
import {
  Field,
  TextField,
  TextareaField,
  SelectField,
  FormBanner,
  SubmitButton,
} from "@/components/form";

const initial: LeaderState = {};

type GeoRow = { lga: string; ward: number; pu_code: string; pu_name: string };

const LEVEL_OPTIONS: { value: TeamLeaderLevel; label: string }[] = [
  { value: "constituency", label: "Constituency-wide" },
  { value: "lga", label: "One local government area" },
  { value: "ward", label: "One ward" },
  { value: "polling_unit", label: "One polling unit" },
];

export function LeaderForm({
  leader,
  geo,
  onDone,
}: {
  leader?: TeamLeader;
  geo: GeoRow[];
  onDone?: () => void;
}) {
  const isEdit = Boolean(leader);
  const [state, formAction, isPending] = useActionState(
    isEdit ? updateTeamLeader : createTeamLeader,
    initial,
  );
  const formRef = useRef<HTMLFormElement>(null);

  const [level, setLevel] = useState<TeamLeaderLevel>(leader?.level ?? "constituency");
  const [lga, setLga] = useState(leader?.lga ?? "");
  const [ward, setWard] = useState(leader?.ward ? String(leader.ward) : "");
  const [pollingUnit, setPollingUnit] = useState(leader?.polling_unit ?? "");

  const [linkedAccount, setLinkedAccount] = useState<PortalAccountMatch | null>(null);
  const [linkQuery, setLinkQuery] = useState("");
  const [linkResults, setLinkResults] = useState<PortalAccountMatch[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!leader?.portal_account_id) return;
    getPortalAccountById(leader.portal_account_id).then((acct) => {
      if (acct) setLinkedAccount(acct);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const [handledSuccess, setHandledSuccess] = useState<string | undefined>(undefined);
  if (!isEdit && state.success && state.success !== handledSuccess) {
    setHandledSuccess(state.success);
    setLevel("constituency");
    setLga("");
    setWard("");
    setPollingUnit("");
    setLinkedAccount(null);
    setLinkQuery("");
    setLinkResults([]);
  }

  useEffect(() => {
    if (!state.success) return;
    if (isEdit) onDone?.();
    else formRef.current?.reset();
  }, [state.success, isEdit, onDone]);

  async function runSearch() {
    setSearching(true);
    try {
      setLinkResults(await searchPortalAccounts(linkQuery));
    } finally {
      setSearching(false);
    }
  }

  const needsLga = level !== "constituency";
  const needsWard = level === "ward" || level === "polling_unit";
  const needsPu = level === "polling_unit";

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      {isEdit && <input type="hidden" name="id" value={leader!.id} />}
      <input type="hidden" name="portal_account_id" value={linkedAccount?.id ?? ""} />

      {state.error && <FormBanner tone="error">{state.error}</FormBanner>}
      {state.success && !isEdit && <FormBanner tone="info">{state.success}</FormBanner>}

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField name="full_name" label="Name" defaultValue={leader?.full_name ?? ""} />
        <TextField
          name="title"
          label="Title"
          helper="e.g. Ward Coordinator"
          defaultValue={leader?.title ?? ""}
        />
        <TextField name="phone" label="Phone" type="tel" optional defaultValue={leader?.phone ?? ""} />
        <TextField name="email" label="Email" type="email" optional defaultValue={leader?.email ?? ""} />
      </div>

      <SelectField
        name="level"
        label="What area do they lead?"
        value={level}
        onChange={(v) => {
          setLevel(v as TeamLeaderLevel);
          setLga("");
          setWard("");
          setPollingUnit("");
        }}
        placeholder="Choose one"
        options={LEVEL_OPTIONS}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {needsLga && (
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
        )}
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
      </div>

      <TextareaField
        name="notes"
        label="Notes"
        rows={2}
        optional
        defaultValue={leader?.notes ?? ""}
      />

      <Field
        label="Link to a results-portal login"
        htmlFor="tl-link-search"
        optional
        helper="If this person also has a portal account, link it to keep their contact details in one place."
      >
        {linkedAccount ? (
          <div className="flex items-center justify-between gap-3 rounded-brand border border-accent/40 bg-accent/10 px-3.5 py-2.5 text-sm">
            <span className="text-text">
              {linkedAccount.full_name} — {linkedAccount.email} ({linkedAccount.role})
            </span>
            <button
              type="button"
              onClick={() => setLinkedAccount(null)}
              className="text-xs text-text-muted underline hover:text-text"
            >
              Unlink
            </button>
          </div>
        ) : (
          <>
            <div className="flex gap-2">
              <input
                id="tl-link-search"
                type="text"
                placeholder="Search by name or email"
                value={linkQuery}
                onChange={(e) => setLinkQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (linkQuery.trim()) runSearch();
                  }
                }}
                className="flex-1 rounded-brand border border-border bg-bg px-3.5 py-2.5 text-sm text-text placeholder:text-text-muted/60 focus:border-accent focus:outline-none"
              />
              <button
                type="button"
                onClick={runSearch}
                disabled={searching || !linkQuery.trim()}
                className="rounded-brand border border-border px-4 py-2 text-sm text-text-muted transition-colors hover:border-accent hover:text-text disabled:opacity-60"
              >
                {searching ? "Searching…" : "Search"}
              </button>
            </div>
            {linkResults.length > 0 && (
              <ul className="mt-2 space-y-1">
                {linkResults.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setLinkedAccount(r);
                        setLinkResults([]);
                      }}
                      className="w-full rounded-brand px-3 py-2 text-left text-sm text-text-muted hover:bg-surface-2 hover:text-text"
                    >
                      {r.full_name} — {r.email} ({r.role})
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </Field>

      <div className="flex items-center gap-3">
        <SubmitButton pending={isPending} pendingLabel="Saving…">
          {isEdit ? "Save changes" : "Add leader"}
        </SubmitButton>
        {isEdit && onDone && (
          <button
            type="button"
            onClick={onDone}
            className="rounded-brand border border-border px-4 py-2.5 text-sm text-text-muted transition-colors hover:border-accent hover:text-text"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
