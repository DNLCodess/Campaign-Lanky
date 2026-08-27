import { requirePortalRole } from "@/lib/portal/session";
import { getPuCoverageForWard } from "@/lib/portal/coverage";
import { CoverageBar } from "@/app/portal/_components/coverage-bar";

export const dynamic = "force-dynamic";

export default async function WardCoveragePage() {
  const session = await requirePortalRole(["ward_agent"]);
  const pus = await getPuCoverageForWard(session.lga!, session.ward!);
  const covered = pus.filter((p) => p.covered).length;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="font-heading text-2xl text-text">
          PU Agent Coverage — {session.lga}, Ward {session.ward}
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          Every polling unit in your ward, and whether it has an active agent yet.
        </p>
      </div>

      <div className="rounded-brand border border-border bg-surface/40 p-5">
        <CoverageBar covered={covered} total={pus.length} />
      </div>

      <div className="overflow-x-auto rounded-brand border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-left text-text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Polling Unit</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Agent</th>
            </tr>
          </thead>
          <tbody>
            {pus.map((pu) => (
              <tr key={pu.pu_code} className="border-t border-border">
                <td className="px-4 py-3 text-text">
                  {pu.pu_name} <span className="text-xs text-text-muted">({pu.pu_code})</span>
                </td>
                <td className="px-4 py-3">
                  {pu.covered ? (
                    <span className="text-accent">Covered</span>
                  ) : (
                    <span className="text-primary">Needs agent</span>
                  )}
                </td>
                <td className="px-4 py-3 text-text-muted">{pu.agent_name ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
