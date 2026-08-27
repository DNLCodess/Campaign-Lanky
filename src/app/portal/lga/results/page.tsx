import { requirePortalRole } from "@/lib/portal/session";
import { listResults } from "@/app/portal/actions/results";
import { ResultsTable } from "@/app/portal/_components/results-table";

export const dynamic = "force-dynamic";

export default async function LgaResultsPage() {
  const session = await requirePortalRole(["lga_coordinator"]);
  const rows = await listResults();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl text-text">Results — {session.lga}</h1>
        <p className="mt-1 text-sm text-text-muted">All submissions across your LGA&apos;s wards.</p>
      </div>
      <ResultsTable rows={rows} />
    </div>
  );
}
