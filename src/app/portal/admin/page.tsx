import { requirePortalRole } from "@/lib/portal/session";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getActiveElection } from "@/app/portal/actions/results";
import { LGAS } from "@/lib/portal/constants";

export const dynamic = "force-dynamic";

async function getOverviewStats() {
  const admin = createAdminSupabase();
  const election = await getActiveElection();

  const [{ count: totalPus }, { count: totalAgents }, { data: allResults }] = await Promise.all([
    admin.from("constituency_geo").select("*", { count: "exact", head: true }),
    admin
      .from("portal_accounts")
      .select("*", { count: "exact", head: true })
      .eq("role", "pu_agent")
      .eq("is_active", true),
    election
      ? admin.from("election_results").select("polling_unit, lga").eq("election_id", election.id)
      : Promise.resolve({ data: [] as { polling_unit: string; lga: string }[] }),
  ]);

  const submittedPus = new Set((allResults ?? []).map((r) => r.polling_unit));
  const byLga = LGAS.map((lga) => {
    const submitted = new Set((allResults ?? []).filter((r) => r.lga === lga).map((r) => r.polling_unit));
    return { lga, submitted: submitted.size };
  });

  return {
    election,
    totalPus: totalPus ?? 0,
    totalAgents: totalAgents ?? 0,
    submittedCount: submittedPus.size,
    byLga,
  };
}

async function getGeoTotalsByLga() {
  const admin = createAdminSupabase();
  const counts = await Promise.all(
    LGAS.map((lga) =>
      admin
        .from("constituency_geo")
        .select("*", { count: "exact", head: true })
        .eq("lga", lga)
        .then((r) => ({ lga, total: r.count ?? 0 })),
    ),
  );
  return counts;
}

export default async function AdminOverviewPage() {
  await requirePortalRole(["constituency_admin"]);
  const { election, totalPus, totalAgents, submittedCount, byLga } = await getOverviewStats();
  const totalsByLga = await getGeoTotalsByLga();

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="font-heading text-2xl text-text">Overview</h1>
        <p className="mt-1 text-sm text-text-muted">
          {election ? `Active election: ${election.name}` : "No active election yet — set one up under Election."}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Polling units" value={totalPus} />
        <StatCard label="Active PU agents" value={totalAgents} />
        <StatCard label="Results submitted" value={submittedCount} />
      </div>

      <div>
        <h2 className="font-heading text-lg text-text">Submission coverage by LGA</h2>
        <div className="mt-3 overflow-x-auto rounded-brand border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-left text-text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">LGA</th>
                <th className="px-4 py-3 font-medium">Submitted</th>
                <th className="px-4 py-3 font-medium">Total PUs</th>
                <th className="px-4 py-3 font-medium">Coverage</th>
              </tr>
            </thead>
            <tbody>
              {byLga.map((row) => {
                const total = totalsByLga.find((t) => t.lga === row.lga)?.total ?? 0;
                const pct = total > 0 ? Math.round((row.submitted / total) * 100) : 0;
                return (
                  <tr key={row.lga} className="border-t border-border">
                    <td className="px-4 py-3 text-text">{row.lga}</td>
                    <td className="px-4 py-3 text-text">{row.submitted}</td>
                    <td className="px-4 py-3 text-text">{total}</td>
                    <td className="px-4 py-3 text-text-muted">{pct}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-brand border border-border bg-surface/40 p-5">
      <p className="text-xs uppercase tracking-wide text-text-muted">{label}</p>
      <p className="mt-2 font-heading text-3xl text-text">{value}</p>
    </div>
  );
}
