import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import { listCandidates } from "@/app/admin/(dashboard)/agent-nominations/candidates/actions";
import { CandidateForm } from "@/app/admin/(dashboard)/agent-nominations/candidates/candidate-form";
import { ELECTION_TYPE_LABELS, type ElectionType } from "@/lib/agents/constants";

export const dynamic = "force-dynamic";

export default async function AgentNominationCandidatesPage() {
  await requireAdmin();
  const candidates = await listCandidates();

  return (
    <div className="mx-auto max-w-3xl px-5 py-8 sm:px-8">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div>
          <h1 className="font-heading text-2xl text-text">Party Agent candidates</h1>
          <p className="text-sm text-text-muted">
            Create a login for each candidate reviewing their own Polling Unit
            Agent nominations. To set the single Authorised Nominator
            (name + signature stamped on every generated form), go to{" "}
            <Link href="/admin/agent-nominations/authorized-nominator" className="text-accent underline">
              Authorised Nominator setup
            </Link>
            .
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
        <h2 className="font-heading text-lg text-text">Add a candidate</h2>
        <div className="mt-5">
          <CandidateForm />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="font-heading text-lg text-text">
          Existing candidates ({candidates.length})
        </h2>
        <div className="mt-3 space-y-3">
          {candidates.map((c) => (
            <div key={c.id} className="rounded-brand border border-border bg-surface/40 p-4">
              <p className="font-medium text-text">{c.full_name}</p>
              <p className="text-sm text-text-muted">{c.email}</p>
              <p className="mt-1 text-sm text-text-muted">
                {c.office} — {ELECTION_TYPE_LABELS[c.election_type as ElectionType]}
              </p>
              <p className="mt-1 font-mono text-xs text-text-muted">
                /agents/submit/{c.slug}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
