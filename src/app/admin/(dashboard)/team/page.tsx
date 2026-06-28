import Link from "next/link";
import { requireAdmin, allowedEmails } from "@/lib/admin-auth";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { AddAdminForm } from "@/app/admin/(dashboard)/team/add-admin-form";
import { removeAdmin } from "@/app/admin/(dashboard)/team/actions";

export const dynamic = "force-dynamic";

const when = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" }) : "—";

export default async function AdminTeamPage() {
  const me = await requireAdmin();
  const allowlist = allowedEmails(); // empty = no restriction

  let users: { id: string; email?: string; created_at: string; last_sign_in_at?: string | null }[] = [];
  let loadError = false;
  try {
    const supabase = createAdminSupabase();
    const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 100 });
    if (error) throw error;
    users = data.users.map((u) => ({
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
    }));
  } catch (err) {
    console.error("[admin team]", err);
    loadError = true;
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div>
          <h1 className="font-heading text-2xl text-text">Admin team</h1>
          <p className="text-sm text-text-muted">
            Manage who can access the dashboard.
          </p>
        </div>
        <Link
          href="/admin"
          className="rounded-brand border border-border px-4 py-2 text-sm text-text-muted transition-colors hover:border-accent hover:text-text"
        >
          ← Dashboard
        </Link>
      </header>

      {/* ADMIN_EMAILS restriction warning */}
      {allowlist.length > 0 && (
        <div className="mt-6 rounded-brand border border-yellow-500/30 bg-yellow-500/8 p-4 text-sm">
          <p className="font-medium text-yellow-300">ADMIN_EMAILS allowlist is active</p>
          <p className="mt-1 text-text-muted">
            Only these addresses can log in:{" "}
            <span className="font-mono text-text">{allowlist.join(", ")}</span>.
            After creating an account here you must also add the email to{" "}
            <code className="text-accent">ADMIN_EMAILS</code> in your environment
            variables and redeploy, otherwise the account will be blocked on login.
          </p>
        </div>
      )}

      {/* Add admin */}
      <section className="mt-8 rounded-brand border border-border bg-surface/40 p-6">
        <h2 className="font-heading text-lg text-text">Add an admin</h2>
        <p className="mt-1 text-sm text-text-muted">
          Creates a confirmed account. Share the temporary password — they can
          change it later.
        </p>
        <div className="mt-5">
          <AddAdminForm />
        </div>
      </section>

      {/* Existing admins */}
      <section className="mt-8">
        <h2 className="font-heading text-lg text-text">
          Current admins{!loadError && ` (${users.length})`}
        </h2>
        {loadError ? (
          <p className="mt-3 rounded-brand border border-primary/40 bg-primary/10 p-4 text-sm text-text">
            Could not load accounts. Ensure <code>SUPABASE_SERVICE_ROLE_KEY</code> is
            set.
          </p>
        ) : (
          <>
            {/* Table (md+) */}
            <div className="mt-3 hidden overflow-x-auto rounded-brand border border-border md:block">
              <table className="w-full min-w-140 text-left text-sm">
                <thead>
                  <tr className="bg-surface/60 text-xs uppercase tracking-wide text-text-muted">
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Added</th>
                    <th className="px-4 py-3 font-medium">Last sign-in</th>
                    <th className="px-4 py-3 font-medium" />
                  </tr>
                </thead>
                <tbody className="text-text-muted">
                  {users.map((u) => (
                    <tr key={u.id} className="border-t border-border/40">
                      <td className="px-4 py-3 text-text">
                        {u.email}
                        {u.id === me.id && (
                          <span className="ml-2 rounded-full bg-accent/15 px-2 py-0.5 text-xs text-accent">
                            you
                          </span>
                        )}
                        {allowlist.length > 0 && u.email && !allowlist.includes(u.email.toLowerCase()) && (
                          <span className="ml-2 rounded-full bg-yellow-500/15 px-2 py-0.5 text-xs text-yellow-300" title="Not in ADMIN_EMAILS — cannot log in">
                            ⚠ blocked
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">{when(u.created_at)}</td>
                      <td className="px-4 py-3">{when(u.last_sign_in_at)}</td>
                      <td className="px-4 py-3 text-right">
                        {u.id !== me.id && (
                          <form action={removeAdmin}>
                            <input type="hidden" name="id" value={u.id} />
                            <button
                              type="submit"
                              className="rounded-brand border border-border px-3 py-1.5 text-xs text-text-muted transition-colors hover:border-primary hover:text-primary"
                            >
                              Remove
                            </button>
                          </form>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Cards (mobile) */}
            <div className="mt-3 space-y-3 md:hidden">
              {users.map((u) => (
                <div key={u.id} className="rounded-brand border border-border bg-surface/40 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 break-all font-medium text-text">
                      {u.email}
                      {u.id === me.id && (
                        <span className="ml-2 rounded-full bg-accent/15 px-2 py-0.5 text-xs text-accent">
                          you
                        </span>
                      )}
                      {allowlist.length > 0 && u.email && !allowlist.includes(u.email.toLowerCase()) && (
                        <span className="ml-1 rounded-full bg-yellow-500/15 px-2 py-0.5 text-xs text-yellow-300">
                          ⚠ blocked
                        </span>
                      )}
                    </p>
                    {u.id !== me.id && (
                      <form action={removeAdmin} className="shrink-0">
                        <input type="hidden" name="id" value={u.id} />
                        <button
                          type="submit"
                          className="rounded-brand border border-border px-3 py-1.5 text-xs text-text-muted transition-colors hover:border-primary hover:text-primary"
                        >
                          Remove
                        </button>
                      </form>
                    )}
                  </div>
                  <div className="mt-3 space-y-1 border-t border-border/40 pt-3 text-xs text-text-muted">
                    <p>Added {when(u.created_at)}</p>
                    <p>Last sign-in {when(u.last_sign_in_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
