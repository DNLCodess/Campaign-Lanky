import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import { listAuthorities } from "@/app/admin/(dashboard)/agent-nominations/authorities/actions";
import { AuthorityForm } from "@/app/admin/(dashboard)/agent-nominations/authorities/authority-form";
import { ELECTION_TYPE_LABELS, type ElectionType } from "@/lib/agents/constants";

export const dynamic = "force-dynamic";

export default async function AgentNominationAuthoritiesPage() {
  await requireAdmin();
  const authorities = await listAuthorities();

  return (
    <div className="mx-auto max-w-3xl px-5 py-8 sm:px-8">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div>
          <h1 className="font-heading text-2xl text-text">Nomination authorities</h1>
          <p className="text-sm text-text-muted">
            Dev-only. Create a login for each candidate reviewing their own
            Polling Unit Agent nominations.
          </p>
        </div>
        <Link
          href="/admin"
          className="rounded-brand border border-border px-4 py-2 text-sm text-text-muted transition-colors hover:border-accent hover:text-text"
        >
          ← Dashboard
        </Link>
      </header>

      <section className="mt-8 rounded-brand border border-border bg-surface/40 p-6">
        <h2 className="font-heading text-lg text-text">Add an authority</h2>
        <div className="mt-5">
          <AuthorityForm />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="font-heading text-lg text-text">
          Existing authorities ({authorities.length})
        </h2>
        <div className="mt-3 space-y-3">
          {authorities.map((a) => (
            <div key={a.id} className="rounded-brand border border-border bg-surface/40 p-4">
              <p className="font-medium text-text">{a.full_name}</p>
              <p className="text-sm text-text-muted">{a.email}</p>
              <p className="mt-1 text-sm text-text-muted">
                {a.office} — {ELECTION_TYPE_LABELS[a.election_type as ElectionType]}
              </p>
              <p className="mt-1 font-mono text-xs text-text-muted">
                /agents/submit/{a.slug}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
