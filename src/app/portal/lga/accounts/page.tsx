import { requirePortalRole } from "@/lib/portal/session";
import { listChildAccounts } from "@/app/portal/actions/accounts";
import { listWards } from "@/lib/portal/geo";
import { AccountRowActions } from "@/app/portal/_components/account-row-actions";
import { WardAgentForm } from "@/app/portal/lga/accounts/ward-agent-form";

export const dynamic = "force-dynamic";

export default async function LgaAccountsPage() {
  const session = await requirePortalRole(["lga_coordinator"]);
  const [agents, wards] = await Promise.all([listChildAccounts(), listWards(session.lga!)]);

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="font-heading text-2xl text-text">Ward Agents — {session.lga}</h1>
        <p className="mt-1 text-sm text-text-muted">Each ward agent creates PU agents for their own ward.</p>
      </div>

      <div className="rounded-brand border border-border bg-surface/40 p-5">
        <WardAgentForm wards={wards} />
      </div>

      <div className="overflow-x-auto rounded-brand border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-left text-text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Ward</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {agents.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-text-muted">
                  No ward agents yet.
                </td>
              </tr>
            )}
            {agents.map((a) => (
              <tr key={a.id} className="border-t border-border align-top">
                <td className="px-4 py-3 text-text">{a.full_name}</td>
                <td className="px-4 py-3 text-text-muted">Ward {a.ward}</td>
                <td className="px-4 py-3 text-text-muted">{a.email}</td>
                <td className="px-4 py-3">
                  <span className={a.is_active ? "text-accent" : "text-text-muted"}>
                    {a.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <AccountRowActions accountId={a.id} isActive={a.is_active} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
