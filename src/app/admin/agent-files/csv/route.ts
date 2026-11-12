import { getAdminUser } from "@/lib/admin-auth";
import { listAdminCandidates, listAllAdminNominations, pickCandidate } from "@/lib/agents/admin-nominations";
import { rowsToCsv } from "@/lib/admin-tables";

export const dynamic = "force-dynamic";

const COLUMNS = [
  "form_no",
  "reference_id",
  "surname",
  "first_name",
  "other_names",
  "gender",
  "phone",
  "email",
  "means_of_id",
  "lga",
  "ward",
  "polling_unit_code",
  "polling_unit_name",
  "status",
  "is_possible_duplicate",
  "is_outside_area",
  "countersign_decision",
  "countersigned_at",
  "created_at",
];

/** Every field submitted by one candidate's agents, as CSV. */
export async function GET(req: Request) {
  if (!(await getAdminUser())) return new Response("Unauthorized", { status: 401 });

  const url = new URL(req.url);
  const candidate = pickCandidate(await listAdminCandidates(), url.searchParams.get("candidate") ?? undefined);
  if (!candidate) return new Response("No candidates", { status: 404 });

  const rows = await listAllAdminNominations(candidate.id);
  const csv = rowsToCsv(COLUMNS, rows as unknown as Record<string, unknown>[]);
  const date = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${candidate.slug}-agents-${date}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
