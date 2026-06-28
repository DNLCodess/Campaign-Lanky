import { requireAdmin } from "@/lib/admin-auth";
import { getUnitLeaders } from "@/lib/unit-leaders";
import { LeaderForm } from "@/app/admin/(dashboard)/unit-leaders/leader-form";
import { LeaderRow, LeaderCard } from "@/app/admin/(dashboard)/unit-leaders/leader-row";

export const dynamic = "force-dynamic";

export default async function UnitLeadersPage() {
  await requireAdmin();
  const leaders = await getUnitLeaders();

  return (
    <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div>
          <h1 className="font-heading text-2xl text-text">Unit Leaders</h1>
          <p className="text-sm text-text-muted">
            Contact directory for the leaders of each unit.
          </p>
        </div>
        {leaders.length > 0 && (
          <a
            href="/admin/unit-leaders/export"
            className="rounded-brand border border-border px-4 py-2 text-sm text-text-muted transition-colors hover:border-accent hover:text-text"
          >
            Export CSV
          </a>
        )}
      </header>

      {/* Add leader */}
      <section className="mt-8 rounded-brand border border-border bg-surface/40 p-6">
        <h2 className="font-heading text-lg text-text">Add a unit leader</h2>
        <div className="mt-5">
          <LeaderForm />
        </div>
      </section>

      {/* Existing leaders */}
      <section className="mt-8">
        <h2 className="font-heading text-lg text-text">
          Leaders ({leaders.length})
        </h2>

        {leaders.length === 0 ? (
          <div className="mt-3 rounded-brand border border-border bg-surface/30 px-4 py-12 text-center text-text-muted">
            No unit leaders yet.
          </div>
        ) : (
          <>
            {/* Table (md+) */}
            <div className="mt-3 hidden overflow-x-auto rounded-brand border border-border md:block">
              <table className="w-full min-w-160 text-left text-sm">
                <thead>
                  <tr className="bg-surface/60 text-xs uppercase tracking-wide text-text-muted">
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Position</th>
                    <th className="px-4 py-3 font-medium">Unit</th>
                    <th className="px-4 py-3 font-medium">Phone</th>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium" />
                  </tr>
                </thead>
                <tbody className="text-text-muted">
                  {leaders.map((l) => (
                    <LeaderRow key={l.id} leader={l} />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Cards (mobile) */}
            <div className="mt-3 space-y-3 md:hidden">
              {leaders.map((l) => (
                <LeaderCard key={l.id} leader={l} />
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
