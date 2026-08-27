import { requirePortalRole } from "@/lib/portal/session";
import { getWardCoverage, getPuCoverageForWard } from "@/lib/portal/coverage";
import { CoverageBar } from "@/app/portal/_components/coverage-bar";

export const dynamic = "force-dynamic";

export default async function LgaCoveragePage() {
  const session = await requirePortalRole(["lga_coordinator"]);
  const wardCoverage = await getWardCoverage(session.lga!);
  const total = wardCoverage.reduce((s, r) => s + r.total, 0);
  const covered = wardCoverage.reduce((s, r) => s + r.covered, 0);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="font-heading text-2xl text-text">PU Agent Coverage — {session.lga}</h1>
        <p className="mt-1 text-sm text-text-muted">
          Which polling units in your LGA still don&apos;t have an active agent.
        </p>
      </div>

      <div className="rounded-brand border border-border bg-surface/40 p-5">
        <CoverageBar covered={covered} total={total} />
      </div>

      <div className="space-y-2">
        {wardCoverage.map((w) => (
          <WardRow key={w.ward} lga={w.lga} ward={w.ward} total={w.total} covered={w.covered} />
        ))}
      </div>
    </div>
  );
}

async function WardRow({
  lga,
  ward,
  total,
  covered,
}: {
  lga: string;
  ward: number;
  total: number;
  covered: number;
}) {
  const uncovered = covered < total ? (await getPuCoverageForWard(lga, ward)).filter((p) => !p.covered) : [];

  return (
    <details className="rounded-brand border border-border bg-surface/20">
      <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3 px-4 py-3">
        <span className="text-sm text-text">Ward {ward}</span>
        <CoverageBar covered={covered} total={total} />
      </summary>
      {uncovered.length > 0 && (
        <div className="border-t border-border/60 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-text-muted">Not yet covered</p>
          <ul className="mt-2 space-y-1 text-sm text-text-muted">
            {uncovered.map((pu) => (
              <li key={pu.pu_code}>
                {pu.pu_name} <span className="text-xs">({pu.pu_code})</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </details>
  );
}
