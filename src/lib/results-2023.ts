import rows from "@/data/reps-2023-pu-results.json";

/**
 * 2023 House of Representatives election, Ibadan South West / Ibadan North
 * West federal constituency (FC/306/OY), broken down by polling unit.
 *
 * INEC's IReV portal only publishes scanned Form EC8A sheets, so every
 * figure in the JSON was transcribed by hand from those sheets. Sheets that
 * were unreadable or the wrong upload have null votes (status "no-result").
 */

export const PARTIES = ["PDP", "APC", "A", "LP", "ADC", "Others"] as const;
export type Party = (typeof PARTIES)[number];

/** Display names, and a fixed color slot per party (never by rank). */
export const PARTY_INFO: Record<Party, { label: string; colorIndex: number }> = {
  PDP: { label: "PDP", colorIndex: 2 },
  APC: { label: "APC", colorIndex: 0 },
  A: { label: "Accord", colorIndex: 1 },
  LP: { label: "LP", colorIndex: 4 },
  ADC: { label: "ADC", colorIndex: 3 },
  // APGA, APP, NNPP, PRP, SDP combined
  Others: { label: "Others", colorIndex: 6 },
};

export type PuStatus = "counted" | "partial" | "no-result";

export type PollingUnitResult = {
  code: string;
  lga: string;
  wardCode: string;
  ward: string;
  name: string;
  registered: number | null;
  accredited: number | null;
  totalValid: number | null;
  votes: Record<Party, number | null>;
  status: PuStatus;
  confidence: "high" | "medium" | "low";
  notes: string;
  sheet: string;
};

/** INEC's declared result for the seat (returning officer, February 2023). */
export const DECLARED = {
  winner: { party: "PDP" as Party, candidate: "Adedeji Stanley Olajide", votes: 23964 },
  runnerUp: { party: "APC" as Party, candidate: "Saheed Akinade-Fijabi", votes: 23019 },
};

export const IREV_URL =
  "https://inecelectionresults.ng/elections/63f8c9871120b93b86d32c10/context/lga";

export type AreaTotals = {
  totalPus: number;
  readPus: number;
  noResultPus: number;
  votes: Record<Party, number>;
  total: number;
};

export type WardTotals = AreaTotals & { lga: string; wardCode: string; ward: string };

export function getPuResults(): PollingUnitResult[] {
  return rows as PollingUnitResult[];
}

function totals(units: PollingUnitResult[]): AreaTotals {
  const votes = Object.fromEntries(PARTIES.map((p) => [p, 0])) as Record<Party, number>;
  for (const u of units) for (const p of PARTIES) votes[p] += u.votes[p] ?? 0;
  const noResultPus = units.filter((u) => u.status === "no-result").length;
  return {
    totalPus: units.length,
    readPus: units.length - noResultPus,
    noResultPus,
    votes,
    total: PARTIES.reduce((s, p) => s + votes[p], 0),
  };
}

export function getResultsSummary() {
  const units = getPuResults();
  const lgas = [...new Set(units.map((u) => u.lga))].sort();

  const wardMap = new Map<string, PollingUnitResult[]>();
  for (const u of units) {
    const key = `${u.lga}|${u.wardCode}`;
    wardMap.set(key, [...(wardMap.get(key) ?? []), u]);
  }
  const wards: WardTotals[] = [...wardMap.values()]
    .map((list) => ({ lga: list[0].lga, wardCode: list[0].wardCode, ward: list[0].ward, ...totals(list) }))
    .sort((a, b) => a.lga.localeCompare(b.lga) || Number(a.wardCode) - Number(b.wardCode));

  return {
    constituency: totals(units),
    byLga: lgas.map((lga) => ({ lga, ...totals(units.filter((u) => u.lga === lga)) })),
    wards,
  };
}
