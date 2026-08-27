import { requirePortalRole } from "@/lib/portal/session";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getActiveElection } from "@/app/portal/actions/results";

export const dynamic = "force-dynamic";

export default async function WardOverviewPage() {
  const session = await requirePortalRole(["ward_agent"]);
  const admin = createAdminSupabase();
  const election = await getActiveElection();

  const [{ count: totalPus }, { count: totalPuAgents }, { data: results }] = await Promise.all([
    admin
      .from("constituency_geo")
      .select("*", { count: "exact", head: true })
      .eq("lga", session.lga!)
      .eq("ward", session.ward!),
    admin
      .from("portal_accounts")
      .select("*", { count: "exact", head: true })
      .eq("role", "pu_agent")
      .eq("lga", session.lga!)
      .eq("ward", session.ward!)
      .eq("is_active", true),
    election
      ? admin
          .from("election_results")
          .select("polling_unit")
          .eq("election_id", election.id)
          .eq("lga", session.lga!)
          .eq("ward", session.ward!)
      : Promise.resolve({ data: [] as { polling_unit: string }[] }),
  ]);

  const submitted = new Set((results ?? []).map((r) => r.polling_unit)).size;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="font-heading text-2xl text-text">
          {session.lga} — Ward {session.ward}
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          {election ? `Active election: ${election.name}` : "No active election yet."}
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Polling units" value={totalPus ?? 0} />
        <StatCard label="Active PU agents" value={totalPuAgents ?? 0} />
        <StatCard label="Results submitted" value={submitted} />
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
