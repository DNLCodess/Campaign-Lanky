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

const initial: LeaderState = {};

const field =
  "mt-1.5 w-full rounded-brand border border-border bg-bg px-4 py-2.5 text-sm text-text placeholder:text-text-muted/50 focus:border-accent focus:outline-none";

type GeoRow = { lga: string; ward: number; pu_code: string; pu_name: string };

const LEVEL_LABELS: Record<TeamLeaderLevel, string> = {
  constituency: "Constituency-wide",
  lga: "LGA",
  ward: "Ward",
  polling_unit: "Polling Unit",
};

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
    // Only ever needs to resolve once, from the initial `leader` prop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lgas = useMemo(() => Array.from(new Set(geo.map((g) => g.lga))), [geo]);
  const wards = useMemo(
    () => Array.from(new Set(geo.filter((g) => g.lga === lga).map((g) => g.ward))).sort((a, b) => a - b),
    [geo, lga],
  );
  const pollingUnits = useMemo(
    () => geo.filter((g) => g.lga === lga && g.ward === Number(ward)),
    [geo, lga, ward],
  );

  // Reset the cascading-select state as soon as a fresh success comes in from
  // useActionState — guarded so it only fires once per new success value,
  // rather than in an effect (which would mean calling setState from inside
  // an effect body).
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

  return (
    <form ref={formRef} action={formAction} className="grid gap-3 sm:grid-cols-2">
      {isEdit && <input type="hidden" name="id" value={leader!.id} />}
      <input type="hidden" name="portal_account_id" value={linkedAccount?.id ?? ""} />

      <label className="block">
        <span className="text-sm font-medium text-text">Name</span>
        <input type="text" name="full_name" required defaultValue={leader?.full_name ?? ""} className={field} />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-text">Title</span>
        <input
          type="text"
          name="title"
          required
          placeholder="e.g. Ward Coordinator"
          defaultValue={leader?.title ?? ""}
          className={field}
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-text">Phone</span>
        <input type="tel" name="phone" defaultValue={leader?.phone ?? ""} className={field} />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-text">Email</span>
        <input type="email" name="email" defaultValue={leader?.email ?? ""} className={field} />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-text">Level</span>
        <select
          name="level"
          required
          value={level}
          onChange={(e) => {
            setLevel(e.target.value as TeamLeaderLevel);
            setLga("");
            setWard("");
            setPollingUnit("");
          }}
          className={field}
        >
          {(Object.keys(LEVEL_LABELS) as TeamLeaderLevel[]).map((l) => (
            <option key={l} value={l}>
              {LEVEL_LABELS[l]}
            </option>
          ))}
        </select>
      </label>

      {level !== "constituency" && (
        <label className="block">
          <span className="text-sm font-medium text-text">LGA</span>
          <select
            name="lga"
            required
            value={lga}
            onChange={(e) => {
              setLga(e.target.value);
              setWard("");
              setPollingUnit("");
            }}
            className={field}
          >
            <option value="" disabled>
              Select LGA
            </option>
            {lgas.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </label>
      )}

      {(level === "ward" || level === "polling_unit") && (
        <label className="block">
          <span className="text-sm font-medium text-text">Ward</span>
          <select
            name="ward"
            required
            value={ward}
            disabled={!lga}
            onChange={(e) => {
              setWard(e.target.value);
              setPollingUnit("");
            }}
            className={field}
          >
            <option value="" disabled>
              Select ward
            </option>
            {wards.map((w) => (
              <option key={w} value={w}>
                Ward {w}
              </option>
            ))}
          </select>
        </label>
      )}

      {level === "polling_unit" && (
        <label className="block sm:col-span-2">
          <span className="text-sm font-medium text-text">Polling Unit</span>
          <select
            name="polling_unit"
            required
            value={pollingUnit}
            disabled={!ward}
            onChange={(e) => setPollingUnit(e.target.value)}
            className={field}
          >
            <option value="" disabled>
              Select polling unit
            </option>
            {pollingUnits.map((pu) => (
              <option key={pu.pu_code} value={pu.pu_code}>
                {pu.pu_name} ({pu.pu_code})
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="block sm:col-span-2">
        <span className="text-sm font-medium text-text">Notes</span>
        <textarea name="notes" rows={2} defaultValue={leader?.notes ?? ""} className={field} />
      </label>

      <div className="rounded-brand border border-border/60 bg-bg/40 p-3 sm:col-span-2">
        <span className="text-sm font-medium text-text">Link to portal login (optional)</span>
        <p className="mt-0.5 text-xs text-text-muted">
          If this person also has a results-portal account, link it to keep contact info in one place.
        </p>
        {linkedAccount ? (
          <div className="mt-2 flex items-center justify-between gap-3 rounded-brand bg-surface-2 px-3 py-2 text-sm">
            <span className="text-text">
              {linkedAccount.full_name} — {linkedAccount.email} ({linkedAccount.role})
            </span>
            <button
              type="button"
              onClick={() => setLinkedAccount(null)}
              className="text-xs text-text-muted underline hover:text-primary"
            >
              Unlink
            </button>
          </div>
        ) : (
          <div className="mt-2">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Search by name or email"
                value={linkQuery}
                onChange={(e) => setLinkQuery(e.target.value)}
                className="flex-1 rounded-brand border border-border bg-bg px-3 py-2 text-sm text-text focus:border-accent focus:outline-none"
              />
              <button
                type="button"
                onClick={runSearch}
                disabled={searching || !linkQuery.trim()}
                className="rounded-brand border border-border px-3 py-2 text-xs text-text-muted transition-colors hover:border-accent hover:text-text disabled:opacity-60"
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
                      className="w-full rounded-brand px-3 py-1.5 text-left text-sm text-text-muted hover:bg-surface-2 hover:text-text"
                    >
                      {r.full_name} — {r.email} ({r.role})
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 sm:col-span-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-brand bg-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
        >
          {isPending ? "Saving…" : isEdit ? "Save changes" : "Add leader"}
        </button>
        {isEdit && onDone && (
          <button
            type="button"
            onClick={onDone}
            className="rounded-brand border border-border px-4 py-2.5 text-sm text-text-muted transition-colors hover:border-accent hover:text-text"
          >
            Cancel
          </button>
        )}
        {state.error && <p className="text-sm text-primary">{state.error}</p>}
        {state.success && !isEdit && <p className="text-sm text-accent">{state.success}</p>}
      </div>
    </form>
  );
}
