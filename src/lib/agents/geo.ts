import "server-only";
import { createAdminSupabase } from "@/lib/supabase/admin";
import type { ElectionType } from "@/lib/agents/constants";

/**
 * Statewide polling-unit geography for Party Agent nominations (INEC IREV,
 * 2023: 33 LGAs, 351 wards, 6,390 PUs). Separate from constituency_geo, which
 * is only the campaign's own Ibadan NW/SW seat and drives the portal.
 */
export type OyoPollingUnit = {
  pu_code: string;
  lga: string;
  ward: number;
  ward_name: string;
  pu_name: string;
  state_constituency_id: number;
  federal_constituency_id: number;
  senatorial_district_id: number;
};

/** What the nomination form's cascading selects need: one candidate's PUs only. */
export type NominationGeoRow = Pick<OyoPollingUnit, "pu_code" | "lga" | "ward" | "ward_name" | "pu_name">;

const PAGE = 1000; // PostgREST's default max-rows; the table is larger, so page through it.

async function fetchOyoPollingUnits(): Promise<OyoPollingUnit[]> {
  const admin = createAdminSupabase();
  const rows: OyoPollingUnit[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await admin
      .from("oyo_polling_units")
      .select("pu_code, lga, ward, ward_name, pu_name, state_constituency_id, federal_constituency_id, senatorial_district_id")
      .order("pu_code")
      .range(from, from + PAGE - 1);
    if (error) throw error;
    rows.push(...((data ?? []) as OyoPollingUnit[]));
    if (!data || data.length < PAGE) break;
  }
  if (rows.length === 0) throw new Error("oyo_polling_units is empty");
  return rows;
}

// Immutable reference data, held per server instance rather than in
// unstable_cache: ~1.3MB serialised is too close to the data cache's per-entry
// limit. A failed load is forgotten so the next request retries.
let cached: Promise<OyoPollingUnit[]> | null = null;
function getOyoPollingUnits(): Promise<OyoPollingUnit[]> {
  cached ??= fetchOyoPollingUnits().catch((err) => {
    cached = null;
    throw err;
  });
  return cached;
}

type AreaColumn = "state_constituency_id" | "federal_constituency_id" | "senatorial_district_id";

/** Which INEC constituency id scopes a candidate of this type; null = all of Oyo. */
export function areaColumnFor(electionType: ElectionType): AreaColumn | null {
  switch (electionType) {
    case "house_of_assembly":
      return "state_constituency_id";
    case "house_of_reps":
      return "federal_constituency_id";
    case "senatorial":
      return "senatorial_district_id";
    default:
      return null;
  }
}

/** True when the candidate's link can't work yet: their office needs a constituency and none is set. */
export function needsConstituency(electionType: ElectionType, constituencyId: number | null): boolean {
  return areaColumnFor(electionType) !== null && constituencyId === null;
}

/**
 * Is this PU in the candidate's area? Mirrors the SQL in
 * refresh_outside_area_flags (docs/superpowers/specs/2026-11-11-oyo-polling-units.sql);
 * keep the two in step.
 */
export function isInCandidateArea(
  pu: OyoPollingUnit,
  electionType: ElectionType,
  constituencyId: number | null,
): boolean {
  const column = areaColumnFor(electionType);
  if (column === null) return true;
  return constituencyId !== null && pu[column] === constituencyId;
}

/** The PUs a candidate's agents may choose from, slimmed for the client. */
export async function getCandidateGeo(
  electionType: ElectionType,
  constituencyId: number | null,
): Promise<NominationGeoRow[]> {
  const all = await getOyoPollingUnits();
  return all
    .filter((pu) => isInCandidateArea(pu, electionType, constituencyId))
    .map(({ pu_code, lga, ward, ward_name, pu_name }) => ({ pu_code, lga, ward, ward_name, pu_name }));
}

export async function getOyoPollingUnit(puCode: string): Promise<OyoPollingUnit | null> {
  const all = await getOyoPollingUnits();
  return all.find((pu) => pu.pu_code === puCode) ?? null;
}

// INEC doesn't name its constituency ids in the data we have, so labels are
// built from the LGAs/wards each one covers. Senatorial districts are the
// three well-known Oyo seats.
const SENATORIAL_NAMES: Record<number, string> = {
  82: "Oyo Central",
  83: "Oyo North",
  84: "Oyo South",
};

/** "1–6", "1–5, 7", "6, 8–12" */
function wardRanges(wards: number[]): string {
  const sorted = [...wards].sort((a, b) => a - b);
  const parts: string[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const start = sorted[i];
    while (i + 1 < sorted.length && sorted[i + 1] === sorted[i] + 1) i++;
    parts.push(start === sorted[i] ? String(start) : `${start}–${sorted[i]}`);
  }
  return parts.join(", ");
}

export type ConstituencyOption = { id: number; label: string };

/** Every constituency for one election type, labelled for an admin picker. Empty for statewide types. */
export async function listConstituencies(electionType: ElectionType): Promise<ConstituencyOption[]> {
  const column = areaColumnFor(electionType);
  if (column === null) return [];
  const all = await getOyoPollingUnits();

  const lgaWardCount = new Map<string, Set<number>>();
  const byId = new Map<number, Map<string, Set<number>>>();
  for (const pu of all) {
    if (!lgaWardCount.has(pu.lga)) lgaWardCount.set(pu.lga, new Set());
    lgaWardCount.get(pu.lga)!.add(pu.ward);
    const id = pu[column];
    if (!byId.has(id)) byId.set(id, new Map());
    const lgas = byId.get(id)!;
    if (!lgas.has(pu.lga)) lgas.set(pu.lga, new Set());
    lgas.get(pu.lga)!.add(pu.ward);
  }

  const options = Array.from(byId, ([id, lgas]) => {
    const names = Array.from(lgas.keys()).sort();
    let label: string;
    if (column === "senatorial_district_id") {
      label = `${SENATORIAL_NAMES[id] ?? `District ${id}`} (${names.length} LGAs)`;
    } else {
      label = names
        .map((lga) => {
          const wards = Array.from(lgas.get(lga)!);
          const isWholeLga = wards.length === lgaWardCount.get(lga)!.size;
          return isWholeLga ? lga : `${lga} (Wards ${wardRanges(wards)})`;
        })
        .join(" / ");
    }
    return { id, label };
  });
  return options.sort((a, b) => a.label.localeCompare(b.label));
}

/** Every election type's constituency options, for the admin screens. */
export async function listAllConstituencies(): Promise<Record<ElectionType, ConstituencyOption[]>> {
  const [house_of_assembly, house_of_reps, senatorial] = await Promise.all([
    listConstituencies("house_of_assembly"),
    listConstituencies("house_of_reps"),
    listConstituencies("senatorial"),
  ]);
  return { presidential: [], governorship: [], senatorial, house_of_reps, house_of_assembly };
}
