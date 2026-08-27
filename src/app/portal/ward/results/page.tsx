import { requirePortalRole } from "@/lib/portal/session";
import { listResults } from "@/app/portal/actions/results";
import { ResultsTable } from "@/app/portal/_components/results-table";

export const dynamic = "force-dynamic";

export default async function WardResultsPage() {
  const session = await requirePortalRole(["ward_agent"]);
  const rows = await listResults();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl text-text">
          Results — {session.lga}, Ward {session.ward}
        </h1>
        <p className="mt-1 text-sm text-text-muted">All submissions from polling units in your ward.</p>
      </div>
      <ResultsTable rows={rows} />
    </div>
  );
}
