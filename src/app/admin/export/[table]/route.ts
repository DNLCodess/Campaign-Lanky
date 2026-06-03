import { getAdminUser } from "@/lib/admin-auth";
import { createAdminSupabase } from "@/lib/supabase/admin";
import {
  ADMIN_TABLES,
  isAdminTable,
  rowsToCsv,
  searchExpression,
} from "@/lib/admin-tables";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ table: string }> },
) {
  if (!(await getAdminUser())) {
    return new Response("Unauthorized", { status: 401 });
  }
  const { table } = await params;
  if (!isAdminTable(table)) {
    return new Response("Not found", { status: 404 });
  }

  const q = new URL(req.url).searchParams.get("q") ?? "";

  try {
    const supabase = createAdminSupabase();
    let query = supabase
      .from(table)
      .select(ADMIN_TABLES[table].csv.join(","))
      .order("created_at", { ascending: false })
      .limit(10000);

    const expr = searchExpression(table, q);
    if (expr) query = query.or(expr);

    const { data, error } = await query;
    if (error) throw error;

    const csv = rowsToCsv(
      ADMIN_TABLES[table].csv,
      (data ?? []) as unknown as Record<string, unknown>[],
    );
    const filename = `lanky-${table}-${new Date().toISOString().slice(0, 10)}.csv`;

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[admin export]", err);
    return new Response("Export failed", { status: 500 });
  }
}
