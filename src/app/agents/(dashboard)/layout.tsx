import Link from "next/link";
import { requireCandidateSession } from "@/lib/agents/session";
import { logoutCandidate } from "@/app/agents/actions/auth";
import { agentsPath } from "@/lib/agents/routes";

export default async function AgentsDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireCandidateSession();

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/60 bg-surface/40 px-5 py-4 sm:px-8">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
          <div>
            <Link href={agentsPath("/")} className="font-heading text-lg text-text">
              {session.full_name}
            </Link>
            <p className="text-xs text-text-muted">{session.office}</p>
          </div>
          <form action={logoutCandidate}>
            <button
              type="submit"
              className="rounded-brand border border-border px-3 py-1.5 text-sm text-text-muted transition-colors hover:border-accent hover:text-text"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-5 py-8 sm:px-8">{children}</main>
    </div>
  );
}
