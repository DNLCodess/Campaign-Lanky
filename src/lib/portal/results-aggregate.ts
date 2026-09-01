import "server-only";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { LGAS } from "@/lib/portal/constants";

export type CandidateInfo = { id: string; name: string; party: string | null; colorIndex: number };
export type CandidateTotal = CandidateInfo & { votes: number };

export type LgaBreakdown = { lga: string; candidates: CandidateTotal[]; reportingPus: number; totalPus: number };
export type WardBreakdown = {
  lga: string;
  ward: number;
  candidates: CandidateTotal[];
  reportingPus: number;
  totalPus: number;
};

export type ElectionAggregate = {
  electionId: string;
  electionName: string;
  candidates: CandidateInfo[];
  totals: CandidateTotal[];
  byLga: LgaBreakdown[];
  byWard: WardBreakdown[];
  reportingPus: number;
  totalPus: number;
};

/**
 * Aggregates one election's submitted results into constituency/LGA/ward
 * totals per candidate, plus PU reporting counts. Pure data — no access
 * control here; callers decide who's allowed to see it (portal pages via
 * requirePortalRole, the public page via the `published` gate in
 * src/lib/public-results.ts).
 */
export async function getElectionAggregate(electionId: string): Promise<ElectionAggregate | null> {
  const admin = createAdminSupabase();

  const [{ data: election }, { data: candidatesRaw }, { data: results }, { data: geo }] = await Promise.all([
    admin.from("elections").select("id, name").eq("id", electionId).single(),
    admin
      .from("candidates")
      .select("id, name, party")
      .eq("election_id", electionId)
      .order("display_order")
      .order("name"),
    admin
      .from("election_results")
      .select("lga, ward, polling_unit, candidate_id, votes_cast")
      .eq("election_id", electionId),
    admin.from("constituency_geo").select("lga, ward"),
  ]);

  if (!election || !candidatesRaw) return null;

  // Stable color order = candidate display order, never vote-count rank.
  const candidates: CandidateInfo[] = candidatesRaw.map((c, i) => ({
    id: c.id,
    name: c.name,
    party: c.party,
    colorIndex: i,
  }));
  const rows = results ?? [];
  const geoRows = geo ?? [];

  const totalPus = geoRows.length;
  const puTotalsByLga = new Map<string, number>();
  const puTotalsByWard = new Map<string, number>();
  for (const g of geoRows) {
    puTotalsByLga.set(g.lga, (puTotalsByLga.get(g.lga) ?? 0) + 1);
    const wKey = `${g.lga}::${g.ward}`;
    puTotalsByWard.set(wKey, (puTotalsByWard.get(wKey) ?? 0) + 1);
  }

  const reportingPuSet = new Set(rows.map((r) => r.polling_unit));
  const reportingByLga = new Map<string, Set<string>>();
  const reportingByWard = new Map<string, Set<string>>();
  const votesTotal = new Map<string, number>();
  const votesByLga = new Map<string, Map<string, number>>();
  const votesByWard = new Map<string, Map<string, number>>();

  for (const r of rows) {
    votesTotal.set(r.candidate_id, (votesTotal.get(r.candidate_id) ?? 0) + r.votes_cast);

    if (!votesByLga.has(r.lga)) votesByLga.set(r.lga, new Map());
    const lgaMap = votesByLga.get(r.lga)!;
    lgaMap.set(r.candidate_id, (lgaMap.get(r.candidate_id) ?? 0) + r.votes_cast);
    if (!reportingByLga.has(r.lga)) reportingByLga.set(r.lga, new Set());
    reportingByLga.get(r.lga)!.add(r.polling_unit);

    const wKey = `${r.lga}::${r.ward}`;
    if (!votesByWard.has(wKey)) votesByWard.set(wKey, new Map());
    const wardMap = votesByWard.get(wKey)!;
    wardMap.set(r.candidate_id, (wardMap.get(r.candidate_id) ?? 0) + r.votes_cast);
    if (!reportingByWard.has(wKey)) reportingByWard.set(wKey, new Set());
    reportingByWard.get(wKey)!.add(r.polling_unit);
  }

  const totals: CandidateTotal[] = candidates.map((c) => ({ ...c, votes: votesTotal.get(c.id) ?? 0 }));

  const byLga: LgaBreakdown[] = LGAS.map((lga) => ({
    lga,
    candidates: candidates.map((c) => ({ ...c, votes: votesByLga.get(lga)?.get(c.id) ?? 0 })),
    reportingPus: reportingByLga.get(lga)?.size ?? 0,
    totalPus: puTotalsByLga.get(lga) ?? 0,
  }));

  const wardKeys = Array.from(puTotalsByWard.keys()).sort((a, b) => {
    const [lgaA, wardA] = a.split("::");
    const [lgaB, wardB] = b.split("::");
    if (lgaA !== lgaB) return LGAS.indexOf(lgaA as never) - LGAS.indexOf(lgaB as never);
    return Number(wardA) - Number(wardB);
  });

  const byWard: WardBreakdown[] = wardKeys.map((key) => {
    const [lga, wardStr] = key.split("::");
    return {
      lga,
      ward: Number(wardStr),
      candidates: candidates.map((c) => ({ ...c, votes: votesByWard.get(key)?.get(c.id) ?? 0 })),
      reportingPus: reportingByWard.get(key)?.size ?? 0,
      totalPus: puTotalsByWard.get(key) ?? 0,
    };
  });

  return {
    electionId,
    electionName: election.name,
    candidates,
    totals,
    byLga,
    byWard,
    reportingPus: reportingPuSet.size,
    totalPus,
  };
}
