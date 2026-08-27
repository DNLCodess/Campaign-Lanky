import { getAdminUser } from "@/lib/admin-auth";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { rowsToCsv } from "@/lib/admin-tables";

export const dynamic = "force-dynamic";

const COLUMNS = ["source", "full_name", "role_or_title", "lga", "ward", "polling_unit", "phone", "email", "created_at"];

/**
 * Combines the leader directory (team_leaders) and the election-portal
 * accounts (portal_accounts) into one team-wide roster — everyone on the
 * team, from either system, in a single CSV.
 */
export async function GET() {
  if (!(await getAdminUser())) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const supabase = createAdminSupabase();
    const [{ data: leaders, error: leadersError }, { data: accounts, error: accountsError }] = await Promise.all([
      supabase
        .from("team_leaders")
        .select("full_name, title, lga, ward, polling_unit, phone, email, created_at")
        .order("full_name"),
      supabase
        .from("portal_accounts")
        .select("full_name, role, lga, ward, polling_unit, phone, email, created_at")
        .order("full_name"),
    ]);
    if (leadersError) throw leadersError;
    if (accountsError) throw accountsError;

    const rows = [
      ...(leaders ?? []).map((l) => ({
        source: "Team Leader",
        full_name: l.full_name,
        role_or_title: l.title,
        lga: l.lga,
        ward: l.ward,
        polling_unit: l.polling_unit,
        phone: l.phone,
        email: l.email,
        created_at: l.created_at,
      })),
      ...(accounts ?? []).map((a) => ({
        source: "Portal Account",
        full_name: a.full_name,
        role_or_title: a.role,
        lga: a.lga,
        ward: a.ward,
        polling_unit: a.polling_unit,
        phone: a.phone,
        email: a.email,
        created_at: a.created_at,
      })),
    ];

    const csv = rowsToCsv(COLUMNS, rows);
    const filename = `lanky-all-team-members-${new Date().toISOString().slice(0, 10)}.csv`;

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[team-leaders export-all]", err);
    return new Response("Export failed", { status: 500 });
  }
}
