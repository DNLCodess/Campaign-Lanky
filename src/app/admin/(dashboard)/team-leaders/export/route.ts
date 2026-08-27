import { NextRequest } from "next/server";
import { getAdminUser } from "@/lib/admin-auth";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { rowsToCsv } from "@/lib/admin-tables";

export const dynamic = "force-dynamic";

const COLUMNS = [
  "full_name",
  "title",
  "level",
  "lga",
  "ward",
  "polling_unit",
  "phone",
  "email",
  "notes",
  "created_at",
];

export async function GET(request: NextRequest) {
  if (!(await getAdminUser())) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const level = searchParams.get("level");
    const lga = searchParams.get("lga");

    const supabase = createAdminSupabase();
    let query = supabase
      .from("team_leaders")
      .select(COLUMNS.join(","))
      .order("level", { ascending: true })
      .order("lga", { ascending: true })
      .order("ward", { ascending: true })
      .order("full_name", { ascending: true })
      .limit(10000);
    if (level) query = query.eq("level", level);
    if (lga) query = query.eq("lga", lga);

    const { data, error } = await query;
    if (error) throw error;

    const csv = rowsToCsv(COLUMNS, (data ?? []) as unknown as Record<string, unknown>[]);
    const suffix = [level, lga].filter(Boolean).join("-").replace(/\s+/g, "_") || "all";
    const filename = `lanky-team-leaders-${suffix}-${new Date().toISOString().slice(0, 10)}.csv`;

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[team-leaders export]", err);
    return new Response("Export failed", { status: 500 });
  }
}
