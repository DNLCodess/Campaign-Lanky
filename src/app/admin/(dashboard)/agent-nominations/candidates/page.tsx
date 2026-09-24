import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import { listCandidates } from "@/app/admin/(dashboard)/agent-nominations/candidates/actions";
import { CandidatesView } from "@/app/admin/(dashboard)/agent-nominations/candidates/candidates-view";

export const dynamic = "force-dynamic";

export default async function AgentNominationCandidatesPage() {
  await requireAdmin();
  const candidates = await listCandidates();

  return (
    <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
      <header className="border-b border-border/60 pb-5">
        <h1 className="font-heading text-2xl text-text">Party Agent candidates</h1>
        <p className="mt-1 text-sm text-text-muted">
          Each candidate gets a login to review their agents’ nominations, and a link to
          send to those agents so they can submit their details.
        </p>
        <p className="mt-2 text-sm text-text-muted">
          Looking for the name and signature stamped on every form?{" "}
          <Link
            href="/admin/agent-nominations/authorized-nominator"
            className="text-accent underline"
          >
            Set up the Authorised Nominator
          </Link>
          .
        </p>
      </header>
      <CandidatesView candidates={candidates} />
    </div>
  );
}
