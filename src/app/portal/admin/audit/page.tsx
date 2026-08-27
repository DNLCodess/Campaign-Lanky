import { requirePortalRole } from "@/lib/portal/session";
import { createAdminSupabase } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

async function getAuditLog() {
  const admin = createAdminSupabase();
  const { data } = await admin
    .from("result_audit_log")
    .select("id, action, table_name, notes, created_at, portal_accounts!result_audit_log_performed_by_fkey(full_name)")
    .order("created_at", { ascending: false })
    .limit(200);
  return data ?? [];
}

export default async function AdminAuditPage() {
  await requirePortalRole(["constituency_admin"]);
  const entries = await getAuditLog();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl text-text">Audit Log</h1>
        <p className="mt-1 text-sm text-text-muted">Most recent 200 actions across the portal.</p>
      </div>

      <div className="overflow-x-auto rounded-brand border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-left text-text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">When</th>
              <th className="px-4 py-3 font-medium">By</th>
              <th className="px-4 py-3 font-medium">Action</th>
              <th className="px-4 py-3 font-medium">Notes</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-text-muted">
                  Nothing logged yet.
                </td>
              </tr>
            )}
            {entries.map((e) => {
              const performer = Array.isArray(e.portal_accounts) ? e.portal_accounts[0] : e.portal_accounts;
              return (
                <tr key={e.id} className="border-t border-border align-top">
                  <td className="whitespace-nowrap px-4 py-3 text-text-muted">
                    {new Date(e.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-text">{performer?.full_name ?? "—"}</td>
                  <td className="px-4 py-3 text-text">
                    {e.action} <span className="text-text-muted">({e.table_name})</span>
                  </td>
                  <td className="px-4 py-3 text-text-muted">{e.notes ?? "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
