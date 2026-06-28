import "server-only";
import { createAdminSupabase } from "@/lib/supabase/admin";

export type UnitLeader = {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  position: string;
  unit: string | null;
  phone: string | null;
  email: string | null;
  photo_url: string | null;
  bio: string | null;
  display_order: number;
  is_published: boolean;
};

/** All unit leaders, ordered for display. Admin-only — reads via service role. */
export async function getUnitLeaders(): Promise<UnitLeader[]> {
  try {
    const supabase = createAdminSupabase();
    const { data } = await supabase
      .from("unit_leaders")
      .select("*")
      .order("display_order", { ascending: true })
      .order("name", { ascending: true });
    return (data ?? []) as UnitLeader[];
  } catch {
    return [];
  }
}

/** Published leaders only — for an eventual public Team page. */
export async function getPublishedUnitLeaders(): Promise<UnitLeader[]> {
  try {
    const supabase = createAdminSupabase();
    const { data } = await supabase
      .from("unit_leaders")
      .select("*")
      .eq("is_published", true)
      .order("display_order", { ascending: true })
      .order("name", { ascending: true });
    return (data ?? []) as UnitLeader[];
  } catch {
    return [];
  }
}
