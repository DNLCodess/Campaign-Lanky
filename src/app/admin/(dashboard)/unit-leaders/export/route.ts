import { getAdminUser } from "@/lib/admin-auth";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { rowsToCsv } from "@/lib/admin-tables";

export const dynamic = "force-dynamic";

const COLUMNS = [
  "name",
  "position",
  "unit",
  "phone",
  "email",
  "is_published",
  "display_order",
  "created_at",
];

export async function GET() {
  if (!(await getAdminUser())) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const supabase = createAdminSupabase();
    const { data, error } = await supabase
      .from("unit_leaders")
      .select(COLUMNS.join(","))
      .order("display_order", { ascending: true })
      .order("name", { ascending: true })
      .limit(10000);
    if (error) throw error;

    const csv = rowsToCsv(COLUMNS, (data ?? []) as unknown as Record<string, unknown>[]);
    const filename = `lanky-unit-leaders-${new Date().toISOString().slice(0, 10)}.csv`;

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[unit-leaders export]", err);
    return new Response("Export failed", { status: 500 });
  }
}
