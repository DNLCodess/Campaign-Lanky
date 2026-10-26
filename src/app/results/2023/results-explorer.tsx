"use client";

import { useMemo, useState } from "react";
import { seriesColor, STATUS_COLORS } from "@/lib/chart-colors";
import {
  PARTIES,
  PARTY_INFO,
  type Party,
  type PollingUnitResult,
  type WardTotals,
} from "@/lib/results-2023";

const PAGE_SIZE = 40;
const PDP_COLOR = seriesColor(PARTY_INFO.PDP.colorIndex);
const APC_COLOR = seriesColor(PARTY_INFO.APC.colorIndex);

type Show = "all" | "pdp" | "apc" | "other" | "check";
type Sort = "code" | "pdp" | "margin-pdp" | "margin-apc" | "turnout";

const fmt = (n: number | null | undefined) => (n == null ? "—" : n.toLocaleString());
const signed = (n: number) => (n > 0 ? `+${n.toLocaleString()}` : n.toLocaleString());

function puTotal(u: PollingUnitResult) {
  return PARTIES.reduce((s, p) => s + (u.votes[p] ?? 0), 0);
}

function puWinner(u: PollingUnitResult): Party | "tie" | null {
  if (u.status === "no-result") return null;
  const ranked = PARTIES.filter((p) => p !== "Others").sort((a, b) => (u.votes[b] ?? 0) - (u.votes[a] ?? 0));
  const [first, second] = ranked;
  if (!(u.votes[first] ?? 0)) return null;
  return u.votes[first] === u.votes[second] ? "tie" : first;
}

function needsChecking(u: PollingUnitResult) {
  return u.status !== "counted" || u.confidence === "low";
}

export function ResultsExplorer({
  units,
  wards,
}: {
  units: PollingUnitResult[];
  wards: WardTotals[];
}) {
  const [query, setQuery] = useState("");
  const [lga, setLga] = useState("");
  const [ward, setWard] = useState("");
  const [show, setShow] = useState<Show>("all");
  const [sort, setSort] = useState<Sort>("code");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [open, setOpen] = useState<string | null>(null);

  const lgas = useMemo(() => [...new Set(wards.map((w) => w.lga))], [wards]);
  const wardOptions = wards.filter((w) => !lga || w.lga === lga);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = units.filter((u) => {
      if (lga && u.lga !== lga) return false;
      if (ward && `${u.lga}|${u.wardCode}` !== ward) return false;
      if (q && !u.name.toLowerCase().includes(q) && !u.code.includes(q)) return false;
      const win = puWinner(u);
      if (show === "pdp") return win === "PDP";
      if (show === "apc") return win === "APC";
      if (show === "other") return win !== null && win !== "PDP" && win !== "APC";
      if (show === "check") return needsChecking(u);
      return true;
    });
    const margin = (u: PollingUnitResult) => (u.votes.PDP ?? 0) - (u.votes.APC ?? 0);
    const turnout = (u: PollingUnitResult) =>
      u.registered && u.accredited ? u.accredited / u.registered : -1;
    const by: Record<Sort, (a: PollingUnitResult, b: PollingUnitResult) => number> = {
      code: (a, b) => a.code.localeCompare(b.code),
      pdp: (a, b) => (b.votes.PDP ?? -1) - (a.votes.PDP ?? -1),
      "margin-pdp": (a, b) => margin(b) - margin(a),
      "margin-apc": (a, b) => margin(a) - margin(b),
      turnout: (a, b) => turnout(b) - turnout(a),
    };
    return list.sort(by[sort]);
  }, [units, query, lga, ward, show, sort]);

  const shownTotals = useMemo(() => {
    const pdp = filtered.reduce((s, u) => s + (u.votes.PDP ?? 0), 0);
    const apc = filtered.reduce((s, u) => s + (u.votes.APC ?? 0), 0);
    return { pdp, apc };
  }, [filtered]);

  const resetPaging = () => {
    setLimit(PAGE_SIZE);
    setOpen(null);
  };

  const pickWard = (w: WardTotals) => {
    setLga(w.lga);
    setWard(`${w.lga}|${w.wardCode}`);
    setQuery("");
    setShow("all");
    resetPaging();
    document.getElementById("polling-units")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const clearFilters = () => {
    setQuery("");
    setLga("");
    setWard("");
    setShow("all");
    setSort("code");
    resetPaging();
  };

  const filtersActive = query || lga || ward || show !== "all";
  const maxWardMargin = Math.max(1, ...wards.map((w) => Math.abs(w.votes.PDP - w.votes.APC)));
  const selectedWard = wards.find((w) => `${w.lga}|${w.wardCode}` === ward);

  return (
    <div className="space-y-16">
      {/* ---------------- Ward margins ---------------- */}
      <section id="wards" aria-labelledby="wards-heading">
        <h2 id="wards-heading" className="font-heading text-2xl text-text sm:text-3xl">
          Ward by ward
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-muted">
          How far PDP was ahead of or behind APC in each ward, counting only the sheets we could
          read. Tap a ward to see its polling units.
        </p>

        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-text-muted">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: APC_COLOR }} aria-hidden />
            APC ahead
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: PDP_COLOR }} aria-hidden />
            PDP ahead
          </span>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
          {lgas.map((name) => (
            <div key={name} className="rounded-brand border border-border bg-surface/40 p-4 sm:p-6">
              <h3 className="font-heading text-lg text-text">{name}</h3>
              <ul className="mt-3 divide-y divide-border/40">
                {wards
                  .filter((w) => w.lga === name)
                  .map((w) => {
                    const margin = w.votes.PDP - w.votes.APC;
                    const pct = (Math.abs(margin) / maxWardMargin) * 50;
                    const color = margin >= 0 ? PDP_COLOR : APC_COLOR;
                    return (
                      <li key={w.wardCode}>
                        <button
                          type="button"
                          onClick={() => pickWard(w)}
                          className="group grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 rounded-md px-2 py-2.5 text-left transition-colors hover:bg-surface-2/60 focus-visible:outline-2 focus-visible:outline-accent sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)_5.5rem]"
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-sm text-text group-hover:text-accent">
                              {w.ward}
                            </span>
                            <span className="block text-xs text-text-muted">
                              {w.readPus}/{w.totalPus} sheets read
                            </span>
                          </span>
                          <span
                            className="relative col-span-2 h-3 rounded-full bg-surface-2 sm:col-span-1"
                            aria-hidden
                          >
                            <span className="absolute inset-y-[-3px] left-1/2 w-px bg-text-muted/50" />
                            <span
                              className="absolute inset-y-0 rounded-full"
                              style={{
                                backgroundColor: color,
                                width: `${pct}%`,
                                left: margin >= 0 ? "50%" : `${50 - pct}%`,
                              }}
                            />
                          </span>
                          <span
                            className="col-start-2 row-start-1 text-right text-sm font-medium tabular-nums sm:col-start-auto sm:row-start-auto"
                            style={{ color }}
                          >
                            {margin >= 0 ? "PDP" : "APC"} {signed(Math.abs(margin))}
                          </span>
                        </button>
                      </li>
                    );
                  })}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- Polling units ---------------- */}
      <section id="polling-units" aria-labelledby="pu-heading" className="scroll-mt-24">
        <h2 id="pu-heading" className="font-heading text-2xl text-text sm:text-3xl">
          Every polling unit
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-muted">
          All 713 polling units, each linked to its original INEC result sheet. Tap a unit for the
          full count and our reading notes.
        </p>

        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-[minmax(0,1.4fr)_repeat(4,minmax(0,1fr))]">
          <label className="col-span-2 block lg:col-span-1">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-text-muted">
              Search
            </span>
            <input
              id="pu-search"
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                resetPaging();
              }}
              placeholder="Polling unit name or code"
              className="w-full rounded-brand border border-border bg-bg px-3 py-2.5 text-sm text-text placeholder:text-text-muted/70 focus:border-accent focus:outline-none"
            />
          </label>
          <Select
            id="pu-lga"
            label="LGA"
            value={lga}
            onChange={(v) => {
              setLga(v);
              setWard("");
              resetPaging();
            }}
            options={[["", "Both LGAs"], ...lgas.map((l) => [l, l] as [string, string])]}
          />
          <Select
            id="pu-ward"
            label="Ward"
            value={ward}
            onChange={(v) => {
              setWard(v);
              resetPaging();
            }}
            options={[
              ["", "All wards"],
              ...wardOptions.map((w) => [`${w.lga}|${w.wardCode}`, lga ? w.ward : `${w.ward} (${w.lga.replace("Ibadan ", "")})`] as [string, string]),
            ]}
          />
          <Select
            id="pu-show"
            label="Show"
            value={show}
            onChange={(v) => {
              setShow(v as Show);
              resetPaging();
            }}
            options={[
              ["all", "All units"],
              ["pdp", "PDP won"],
              ["apc", "APC won"],
              ["other", "Another party won"],
              ["check", "Needs checking"],
            ]}
          />
          <Select
            id="pu-sort"
            label="Sort by"
            value={sort}
            onChange={(v) => {
              setSort(v as Sort);
              resetPaging();
            }}
            options={[
              ["code", "PU code"],
              ["pdp", "Most PDP votes"],
              ["margin-pdp", "Biggest PDP lead"],
              ["margin-apc", "Biggest APC lead"],
              ["turnout", "Highest turnout"],
            ]}
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-brand border border-border bg-surface/40 px-4 py-3 text-sm">
          <p className="text-text-muted">
            <span className="font-medium text-text">{filtered.length.toLocaleString()}</span>{" "}
            {filtered.length === 1 ? "polling unit" : "polling units"}
            {selectedWard && <> in {selectedWard.ward}</>}
            <span className="mx-2 text-border">·</span>
            <span style={{ color: PDP_COLOR }} className="font-medium">
              PDP {fmt(shownTotals.pdp)}
            </span>
            <span className="mx-2 text-border">·</span>
            <span style={{ color: APC_COLOR }} className="font-medium">
              APC {fmt(shownTotals.apc)}
            </span>
          </p>
          {filtersActive && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-sm font-medium text-accent hover:text-accent-hover"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Column headings (wide screens only; each row labels itself on phones) */}
        <div className="mt-4 hidden grid-cols-[minmax(0,1fr)_5rem_5rem_6rem_7rem_1.5rem] gap-3 px-4 text-xs font-medium uppercase tracking-wider text-text-muted md:grid">
          <span>Polling unit</span>
          <span className="text-right">PDP</span>
          <span className="text-right">APC</span>
          <span className="text-right">PDP lead</span>
          <span>Result</span>
          <span />
        </div>

        <ul className="mt-2 space-y-2">
          {filtered.slice(0, limit).map((u) => (
            <PuRow
              key={u.code}
              unit={u}
              open={open === u.code}
              onToggle={() => setOpen(open === u.code ? null : u.code)}
            />
          ))}
        </ul>

        {filtered.length === 0 && (
          <p className="mt-6 rounded-brand border border-border bg-surface/30 p-6 text-center text-sm text-text-muted">
            No polling units match these filters.{" "}
            <button type="button" onClick={clearFilters} className="font-medium text-accent">
              Clear filters
            </button>
          </p>
        )}

        {filtered.length > limit && (
          <div className="mt-5 flex justify-center">
            <button
              type="button"
              onClick={() => setLimit(limit + PAGE_SIZE)}
              className="rounded-full border border-border bg-surface/60 px-5 py-2.5 text-sm font-medium text-text transition-colors hover:border-accent hover:text-accent"
            >
              Show {Math.min(PAGE_SIZE, filtered.length - limit)} more of{" "}
              {(filtered.length - limit).toLocaleString()} remaining
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

function Select({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: [string, string][];
}) {
  return (
    <label className="block min-w-0" htmlFor={id}>
      <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-text-muted">
        {label}
      </span>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-brand border border-border bg-bg px-3 py-2.5 text-sm text-text focus:border-accent focus:outline-none"
      >
        {options.map(([v, text]) => (
          <option key={v} value={v}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
}

function StatusChip({ unit }: { unit: PollingUnitResult }) {
  const winner = puWinner(unit);
  if (unit.status === "no-result") {
    return <Chip color={STATUS_COLORS.critical}>No result</Chip>;
  }
  if (needsChecking(unit)) {
    return (
      <span className="flex flex-wrap gap-1.5">
        {winner && winner !== "tie" && <WinnerChip party={winner} />}
        <Chip color={STATUS_COLORS.warning}>Check sheet</Chip>
      </span>
    );
  }
  if (winner === "tie") return <Chip color="var(--text-muted)">Tie</Chip>;
  return winner ? <WinnerChip party={winner} /> : null;
}

function WinnerChip({ party }: { party: Party }) {
  return <Chip color={seriesColor(PARTY_INFO[party].colorIndex)}>{PARTY_INFO[party].label} won</Chip>;
}

function Chip({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-bg/60 px-2 py-0.5 text-xs text-text">
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} aria-hidden />
      {children}
    </span>
  );
}

function ShareBar({ unit }: { unit: PollingUnitResult }) {
  const total = puTotal(unit);
  if (!total) return <div className="h-1.5 rounded-full bg-surface-2" aria-hidden />;
  return (
    <div className="flex h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden>
      {PARTIES.map((p) => {
        const v = unit.votes[p] ?? 0;
        if (!v) return null;
        return (
          <span
            key={p}
            style={{ width: `${(v / total) * 100}%`, backgroundColor: seriesColor(PARTY_INFO[p].colorIndex) }}
          />
        );
      })}
    </div>
  );
}

function PuRow({
  unit: u,
  open,
  onToggle,
}: {
  unit: PollingUnitResult;
  open: boolean;
  onToggle: () => void;
}) {
  const hasVotes = u.status !== "no-result";
  const margin = (u.votes.PDP ?? 0) - (u.votes.APC ?? 0);
  const total = puTotal(u);
  const detailId = `pu-${u.code.replaceAll("/", "-")}`;

  return (
    <li className="overflow-hidden rounded-brand border border-border bg-surface/40">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={detailId}
        className="grid w-full grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-2 px-4 py-3 text-left transition-colors hover:bg-surface-2/50 focus-visible:outline-2 focus-visible:outline-accent md:grid-cols-[minmax(0,1fr)_5rem_5rem_6rem_7rem_1.5rem] md:items-center"
      >
        <span className="min-w-0">
          <span className="block text-sm font-medium text-text">{u.name}</span>
          <span className="mt-0.5 block text-xs text-text-muted">
            <span className="tabular-nums">{u.code}</span> · {u.ward}
          </span>
          <span className="mt-2 block md:max-w-xs">
            <ShareBar unit={u} />
          </span>
        </span>

        {/* Phones: compact figures under the name */}
        <span className="col-span-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm md:hidden">
          {hasVotes ? (
            <>
              <span className="tabular-nums">
                <span className="text-text-muted">PDP </span>
                <span className="font-medium" style={{ color: PDP_COLOR }}>
                  {fmt(u.votes.PDP)}
                </span>
              </span>
              <span className="tabular-nums">
                <span className="text-text-muted">APC </span>
                <span className="font-medium" style={{ color: APC_COLOR }}>
                  {fmt(u.votes.APC)}
                </span>
              </span>
              <span className="tabular-nums text-text-muted">
                Lead <span className="font-medium text-text">{signed(margin)}</span>
              </span>
            </>
          ) : null}
          <StatusChip unit={u} />
        </span>

        {/* Wide screens: aligned columns */}
        <span className="hidden text-right text-sm font-medium tabular-nums md:block" style={{ color: PDP_COLOR }}>
          {hasVotes ? fmt(u.votes.PDP) : "—"}
        </span>
        <span className="hidden text-right text-sm font-medium tabular-nums md:block" style={{ color: APC_COLOR }}>
          {hasVotes ? fmt(u.votes.APC) : "—"}
        </span>
        <span className="hidden text-right text-sm tabular-nums text-text md:block">
          {hasVotes ? signed(margin) : "—"}
        </span>
        <span className="hidden md:block">
          <StatusChip unit={u} />
        </span>

        <span
          className={`col-start-2 row-start-1 self-start text-text-muted transition-transform md:col-start-auto md:row-start-auto md:self-center ${open ? "rotate-180" : ""}`}
          aria-hidden
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M5 7.5l5 5 5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>

      {open && (
        <div id={detailId} className="border-t border-border/60 bg-bg/40 px-4 py-4">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-text-muted">Votes</p>
              {hasVotes ? (
                <dl className="mt-2 space-y-1.5 text-sm">
                  {PARTIES.map((p) => (
                    <div key={p} className="flex items-center justify-between gap-3">
                      <dt className="flex items-center gap-2 text-text">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: seriesColor(PARTY_INFO[p].colorIndex) }}
                          aria-hidden
                        />
                        {PARTY_INFO[p].label}
                      </dt>
                      <dd className="tabular-nums text-text">
                        {u.votes[p] == null ? <span className="text-text-muted">unreadable</span> : fmt(u.votes[p])}
                        {u.votes[p] != null && total > 0 && (
                          <span className="ml-2 inline-block w-11 text-right text-xs text-text-muted">
                            {(((u.votes[p] ?? 0) / total) * 100).toFixed(1)}%
                          </span>
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="mt-2 text-sm text-text-muted">
                  No usable result for this polling unit. See the notes and the original sheet.
                </p>
              )}
              {hasVotes && (
                <p className="mt-2 text-xs text-text-muted">Others: APGA, APP, NNPP, PRP and SDP combined.</p>
              )}
              <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-border/50 pt-3 text-xs">
                {(
                  [
                    ["Registered", u.registered],
                    ["Accredited", u.accredited],
                    ["Valid votes", u.totalValid],
                  ] as const
                ).map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-text-muted">{label}</dt>
                    <dd className="mt-0.5 text-sm tabular-nums text-text">{fmt(value)}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
                Reading notes
                <span className="ml-2 normal-case tracking-normal">
                  ({u.confidence} confidence)
                </span>
              </p>
              <p className="mt-2 text-sm leading-relaxed text-text-muted">
                {u.notes || "Clear sheet. Party votes add up to the total valid votes."}
              </p>
              <a
                href={u.sheet}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium text-accent transition-colors hover:border-accent hover:text-accent-hover"
              >
                View the original result sheet (PDF)
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                  <path d="M5 3h6v6M11 3L3.5 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      )}
    </li>
  );
}
