import { requirePortalRole } from "@/lib/portal/session";
import { listRewards } from "@/app/portal/actions/rewards";
import { ApproveRewardForm, MarkSentButton } from "@/app/portal/admin/rewards/reward-actions";
import { GrantRewardForm } from "@/app/portal/admin/rewards/grant-reward-form";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, string> = {
  pending: "text-text-muted",
  approved: "text-accent",
  sent: "text-primary",
};

function one<T>(v: T | T[] | null): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

export default async function AdminRewardsPage() {
  await requirePortalRole(["constituency_admin"]);
  const rewards = await listRewards();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl text-text">Rewards</h1>
        <p className="mt-1 text-sm text-text-muted">
          A reward is claimed automatically when a PU agent submits their result — or grant one
          manually to any leader below. Either way, move it through Pending → Approved → Sent
          yourself; nothing is sent automatically.
        </p>
      </div>

      <div className="rounded-brand border border-border bg-surface/40 p-5">
        <h2 className="font-heading text-lg text-text">Grant a reward</h2>
        <div className="mt-4">
          <GrantRewardForm />
        </div>
      </div>

      <div className="overflow-x-auto rounded-brand border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-left text-text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Recipient</th>
              <th className="px-4 py-3 font-medium">Role / Location</th>
              <th className="px-4 py-3 font-medium">Reason</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {rewards.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-text-muted">
                  No rewards yet.
                </td>
              </tr>
            )}
            {rewards.map((r) => {
              const account = one(r.portal_accounts);
              const leader = one(r.team_leaders);
              const name = account?.full_name ?? leader?.full_name;
              const contact = account?.email;
              const location = account
                ? (account.polling_unit ?? `${account.lga ?? ""} Ward ${account.ward ?? ""}`)
                : leader
                  ? (leader.polling_unit ?? (leader.lga ? `${leader.lga} Ward ${leader.ward}` : "Constituency-wide"))
                  : "—";
              const roleLabel = account?.role ?? leader?.title ?? "—";
              return (
                <tr key={r.id} className="border-t border-border align-top">
                  <td className="px-4 py-3 text-text">
                    {name}
                    {contact && <div className="text-xs text-text-muted">{contact}</div>}
                  </td>
                  <td className="px-4 py-3 text-text-muted">
                    {roleLabel}
                    <div className="text-xs">{location}</div>
                  </td>
                  <td className="px-4 py-3 text-text-muted">
                    {r.trigger_type === "result_submission" ? "Result submitted" : "Manual"}
                  </td>
                  <td className={`px-4 py-3 font-medium capitalize ${STATUS_STYLE[r.status]}`}>{r.status}</td>
                  <td className="px-4 py-3 text-text">{r.amount ? `₦${r.amount}` : "—"}</td>
                  <td className="px-4 py-3">
                    {r.status === "pending" && <ApproveRewardForm rewardId={r.id} />}
                    {r.status === "approved" && <MarkSentButton rewardId={r.id} />}
                    {r.status === "sent" && <span className="text-xs text-text-muted">Done</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
