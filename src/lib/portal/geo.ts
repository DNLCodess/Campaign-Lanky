import "server-only";
import { createAdminSupabase } from "@/lib/supabase/admin";

export async function listWards(lga: string): Promise<number[]> {
  const admin = createAdminSupabase();
  const { data } = await admin
    .from("constituency_geo")
    .select("ward")
    .eq("lga", lga)
    .order("ward");
  const wards = Array.from(new Set((data ?? []).map((r) => r.ward as number)));
  return wards;
}

export async function listPollingUnits(
  lga: string,
  ward: number,
): Promise<{ pu_code: string; pu_name: string }[]> {
  const admin = createAdminSupabase();
  const { data } = await admin
    .from("constituency_geo")
    .select("pu_code, pu_name")
    .eq("lga", lga)
    .eq("ward", ward)
    .order("pu_code");
  return data ?? [];
}

export async function getPollingUnit(
  puCode: string,
): Promise<{ lga: string; ward: number; pu_code: string; pu_name: string } | null> {
  const admin = createAdminSupabase();
  const { data } = await admin
    .from("constituency_geo")
    .select("lga, ward, pu_code, pu_name")
    .eq("pu_code", puCode)
    .single();
  return data ?? null;
}

/** Full constituency geography — small (713 rows), fetched once for client-side cascading selects. */
export async function getAllConstituencyGeo(): Promise<
  { lga: string; ward: number; pu_code: string; pu_name: string }[]
> {
  const admin = createAdminSupabase();
  const { data } = await admin
    .from("constituency_geo")
    .select("lga, ward, pu_code, pu_name")
    .order("lga")
    .order("ward")
    .order("pu_code");
  return data ?? [];
}
