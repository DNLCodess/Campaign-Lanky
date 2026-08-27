import "server-only";
import { createAdminSupabase } from "@/lib/supabase/admin";

export type TeamLeaderLevel = "constituency" | "lga" | "ward" | "polling_unit";

export type TeamLeader = {
  id: string;
  full_name: string;
  title: string;
  phone: string | null;
  email: string | null;
  level: TeamLeaderLevel;
  lga: string | null;
  ward: number | null;
  polling_unit: string | null;
  portal_account_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type TeamLeaderFilters = { level?: string; lga?: string; ward?: number };

/** All team leaders, newest first. Admin-only — reads via service role. */
export async function getTeamLeaders(filters: TeamLeaderFilters = {}): Promise<TeamLeader[]> {
  try {
    const supabase = createAdminSupabase();
    let query = supabase.from("team_leaders").select("*").order("created_at", { ascending: false });
    if (filters.level) query = query.eq("level", filters.level);
    if (filters.lga) query = query.eq("lga", filters.lga);
    if (filters.ward) query = query.eq("ward", filters.ward);
    const { data } = await query;
    return (data ?? []) as TeamLeader[];
  } catch {
    return [];
  }
}

export { getAllConstituencyGeo } from "@/lib/portal/geo";
