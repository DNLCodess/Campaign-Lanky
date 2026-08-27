import { requirePortalRole } from "@/lib/portal/session";
import { getWardCoverage, getPuCoverageForWard } from "@/lib/portal/coverage";
import { CoverageBar } from "@/app/portal/_components/coverage-bar";
import { LGAS } from "@/lib/portal/constants";

export const dynamic = "force-dynamic";

export default async function AdminCoveragePage() {
  await requirePortalRole(["constituency_admin"]);
  const wardCoverage = await getWardCoverage();

  const totals = LGAS.map((lga) => {
    const rows = wardCoverage.filter((w) => w.lga === lga);
    return {
      lga,
      total: rows.reduce((s, r) => s + r.total, 0),
      covered: rows.reduce((s, r) => s + r.covered, 0),
    };
  });

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="font-heading text-2xl text-text">PU Agent Coverage</h1>
        <p className="mt-1 text-sm text-text-muted">
          Which polling units still don&apos;t have an active agent recruited.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {totals.map((t) => (
          <div key={t.lga} className="rounded-brand border border-border bg-surface/40 p-5">
            <p className="text-sm text-text">{t.lga}</p>
            <div className="mt-2">
              <CoverageBar covered={t.covered} total={t.total} />
            </div>
          </div>
        ))}
      </div>

      {LGAS.map((lga) => (
        <div key={lga}>
          <h2 className="font-heading text-lg text-text">{lga}</h2>
          <div className="mt-3 space-y-2">
            {wardCoverage
              .filter((w) => w.lga === lga)
              .map((w) => (
                <WardRow key={`${w.lga}-${w.ward}`} lga={w.lga} ward={w.ward} total={w.total} covered={w.covered} />
              ))}
          </div>
        </div>
      ))}
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
