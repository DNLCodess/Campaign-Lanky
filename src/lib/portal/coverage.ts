import "server-only";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getCachedGeo } from "@/lib/portal/geo";
import { LGAS } from "@/lib/portal/constants";

export type WardCoverage = {
  lga: string;
  ward: number;
  total: number;
  covered: number;
};

export type PuCoverage = {
  pu_code: string;
  pu_name: string;
  covered: boolean;
  agent_name: string | null;
};

async function activePuAgentCodes(): Promise<Set<string>> {
  const admin = createAdminSupabase();
  const { data } = await admin
    .from("portal_accounts")
    .select("polling_unit")
    .eq("role", "pu_agent")
    .eq("is_active", true);
  return new Set((data ?? []).map((r) => r.polling_unit as string).filter(Boolean));
}

/** Ward-by-ward coverage across both LGAs (or one, if `lga` is given). */
export async function getWardCoverage(lga?: string): Promise<WardCoverage[]> {
  const [allGeo, covered] = await Promise.all([getCachedGeo(), activePuAgentCodes()]);
  const geo = lga ? allGeo.filter((g) => g.lga === lga) : allGeo;

  const totals = new Map<string, { lga: string; ward: number; total: number; covered: number }>();
  for (const row of geo) {
    const key = `${row.lga}::${row.ward}`;
    if (!totals.has(key)) totals.set(key, { lga: row.lga, ward: row.ward, total: 0, covered: 0 });
    const entry = totals.get(key)!;
    entry.total += 1;
    if (covered.has(row.pu_code)) entry.covered += 1;
  }

  const result = Array.from(totals.values());
  result.sort((a, b) => (a.lga === b.lga ? a.ward - b.ward : LGAS.indexOf(a.lga as never) - LGAS.indexOf(b.lga as never)));
  return result;
}

/** Every PU in one ward, flagged covered/uncovered — the most actionable view for a ward agent. */
export async function getPuCoverageForWard(lga: string, ward: number): Promise<PuCoverage[]> {
  const admin = createAdminSupabase();
  const [allGeo, { data: agents }] = await Promise.all([
    getCachedGeo(),
    admin
      .from("portal_accounts")
      .select("polling_unit, full_name")
      .eq("role", "pu_agent")
      .eq("is_active", true)
      .eq("lga", lga)
      .eq("ward", ward),
  ]);
  const geo = allGeo
    .filter((g) => g.lga === lga && g.ward === ward)
    .sort((a, b) => a.pu_code.localeCompare(b.pu_code));

  const agentByPu = new Map((agents ?? []).map((a) => [a.polling_unit as string, a.full_name as string]));
  return geo.map((pu) => ({
    pu_code: pu.pu_code,
    pu_name: pu.pu_name,
    covered: agentByPu.has(pu.pu_code),
    agent_name: agentByPu.get(pu.pu_code) ?? null,
  }));
}
