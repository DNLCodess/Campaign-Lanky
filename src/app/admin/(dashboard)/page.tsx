import { requireAdmin } from "@/lib/admin-auth";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { type AdminTableKey } from "@/lib/admin-tables";
import { DonationProgressBar } from "@/components/donation-progress-bar";

export const dynamic = "force-dynamic";

const naira = (n: unknown) => `₦${Number(n).toLocaleString("en-NG")}`;

export default async function AdminOverview() {
  const user = await requireAdmin();

  let configured = true;
  const counts: Record<AdminTableKey, number> = {
    voter_registrations: 0,
    donations: 0,
    volunteers: 0,
    leads: 0,
    dp_supporters: 0,
    messages: 0,
  };
  let raised = 0;
  let successfulCount = 0;
  let firstDonationAt: string | null = null;

  try {
    const supabase = createAdminSupabase();

    const countOf = async (t: AdminTableKey) => {
      const { count } = await supabase.from(t).select("*", { count: "exact", head: true });
      return count ?? 0;
    };
    const [vrc, dc, vc, lc, dpc, mc, successful, firstDonation] = await Promise.all([
      countOf("voter_registrations"),
      countOf("donations"),
      countOf("volunteers"),
      countOf("leads"),
      countOf("dp_supporters"),
      countOf("messages"),
      supabase.from("donations").select("amount").eq("status", "successful").limit(10000),
      supabase
        .from("donations")
        .select("created_at")
        .eq("status", "successful")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle(),
    ]);
    counts.voter_registrations = vrc;
    counts.donations = dc;
    counts.volunteers = vc;
    counts.leads = lc;
    counts.dp_supporters = dpc;
    counts.messages = mc;
    const sRows = (successful.data ?? []) as { amount: number }[];
    successfulCount = sRows.length;
    raised = sRows.reduce((s, r) => s + Number(r.amount), 0);
    firstDonationAt = (firstDonation.data as { created_at: string } | null)?.created_at ?? null;
  } catch (err) {
    console.error("[admin] overview load failed", err);
    configured = false;
  }

  return (
    <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
      <header className="border-b border-border/60 pb-6">
        <h1 className="font-heading text-2xl text-text">Overview</h1>
        <p className="text-sm text-text-muted">{user.email}</p>
      </header>

      {!configured && (
        <p className="mt-6 rounded-brand border border-primary/40 bg-primary/10 p-4 text-sm text-text">
          Data source not configured. Set <code>SUPABASE_SERVICE_ROLE_KEY</code> to
          load submissions.
        </p>
      )}

      {/* Stat cards */}
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <Stat label="Voter cards" value={String(counts.voter_registrations)} sub="registrations" />
        <Stat label="Total raised" value={naira(raised)} sub={`${successfulCount} donations`} />
        <Stat label="Supporters" value={String(counts.leads)} sub="email / phone signups" />
        <Stat label="Volunteers" value={String(counts.volunteers)} sub="sign-ups" />
        <Stat label="Messages" value={String(counts.messages)} sub="contact form" />
      </div>

      {/* Campaign goal section */}
      <div className="mt-8 rounded-brand border border-border bg-surface/30 p-6 sm:p-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-heading text-xl text-text">Campaign fundraising goal</h2>
            <p className="mt-0.5 text-sm text-text-muted">Target: ₦100,000,000</p>
          </div>
          {configured && successfulCount > 0 && firstDonationAt && (
            <GoalVelocity raised={raised} firstDonationAt={firstDonationAt} />
          )}
        </div>
        {configured ? (
          <DonationProgressBar raised={raised} count={successfulCount} variant="full" />
        ) : (
          <p className="text-sm text-text-muted/60">Configure Supabase to see live goal progress.</p>
        )}
      </div>
    </div>
  );
}

function GoalVelocity({
  raised,
  firstDonationAt,
}: {
  raised: number;
  firstDonationAt: string;
}) {
  const GOAL = 100_000_000;
  const remaining = Math.max(0, GOAL - raised);
  const daysSinceStart = Math.max(
    1,
    (Date.now() - new Date(firstDonationAt).getTime()) / (1000 * 60 * 60 * 24),
  );
  const dailyRate = raised / daysSinceStart;
  const daysToGoal = dailyRate > 0 ? Math.ceil(remaining / dailyRate) : null;

  const fmt = (n: number) =>
    n >= 1_000_000
      ? `₦${(n / 1_000_000).toFixed(1)}M`
      : n >= 1_000
        ? `₦${Math.round(n / 1_000)}K`
        : `₦${Math.round(n).toLocaleString("en-NG")}`;

  return (
    <div className="flex flex-wrap gap-4 text-right text-xs text-text-muted">
      <div>
        <p className="font-medium text-text">{fmt(Math.round(dailyRate))}</p>
        <p>avg / day</p>
      </div>
      <div>
        <p className="font-medium text-text">{fmt(remaining)}</p>
        <p>remaining</p>
      </div>
      {daysToGoal !== null && (
        <div>
          <p className="font-medium text-text">
            {daysToGoal > 365
              ? `${Math.round(daysToGoal / 30)}mo`
              : `${daysToGoal}d`}
          </p>
          <p>est. to goal</p>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-brand border border-border bg-surface/40 p-5">
      <p className="text-xs uppercase tracking-widest text-text-muted">{label}</p>
      <p className="mt-2 font-heading text-3xl text-text">{value}</p>
      <p className="mt-1 text-xs text-text-muted/70">{sub}</p>
    </div>
  );
}
