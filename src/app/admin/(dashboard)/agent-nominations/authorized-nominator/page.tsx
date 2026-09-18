import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import { getAuthorizedNominator } from "@/app/admin/(dashboard)/agent-nominations/authorized-nominator/actions";
import { NominatorForm } from "@/app/admin/(dashboard)/agent-nominations/authorized-nominator/nominator-form";

export const dynamic = "force-dynamic";

export default async function AuthorizedNominatorPage() {
  await requireAdmin();
  const nominator = await getAuthorizedNominator();

  return (
    <div className="mx-auto max-w-2xl px-5 py-8 sm:px-8">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div>
          <h1 className="font-heading text-2xl text-text">Authorised Nominator</h1>
          <p className="text-sm text-text-muted">
            Dev-only. The single top party leader whose name and signature are
            stamped on every generated nomination PDF, across all candidates.
          </p>
        </div>
        <Link
          href="/admin/agent-nominations/candidates"
          className="rounded-brand border border-border px-4 py-2 text-sm text-text-muted transition-colors hover:border-accent hover:text-text"
        >
          ← Candidates
        </Link>
      </header>

      {nominator && (
        <div className="mt-6 rounded-brand border border-border bg-surface/40 p-4 text-sm">
          <p className="text-text-muted">
            Currently set to <span className="font-medium text-text">{nominator.full_name}</span>.
          </p>
          {nominator.signatureUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={nominator.signatureUrl}
              alt="Current signature"
              className="mt-3 h-20 w-auto max-w-xs rounded border border-border bg-white object-contain p-2"
            />
          )}
        </div>
      )}

      <section className="mt-6 rounded-brand border border-border bg-surface/40 p-6">
        <NominatorForm currentName={nominator?.full_name} />
      </section>
    </div>
  );
}
