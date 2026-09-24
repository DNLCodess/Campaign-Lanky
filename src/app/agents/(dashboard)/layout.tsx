import Link from "next/link";
import { LankyMark } from "@/components/brand/lanky-mark";
import { requireCandidateSession } from "@/lib/agents/session";
import { countCandidateNominations } from "@/lib/agents/nominations";
import { logoutCandidate } from "@/app/agents/actions/auth";
import { agentsPath } from "@/lib/agents/routes";
import { AgentsNav } from "@/app/agents/(dashboard)/agents-nav";

export default async function AgentsDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireCandidateSession();
  const hasNominations = (await countCandidateNominations(session.id)) > 0;

  return (
    <div>
      <header className="sticky top-0 z-20 border-b border-border/60 bg-bg/85 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-8 gap-y-3 px-5 pb-3 pt-4 sm:px-8 md:py-3.5">
          <Link href={agentsPath("/")} className="flex items-center gap-3">
            <LankyMark className="h-8 w-8" />
            <span className="font-heading text-base text-text">Party Agent Nominations</span>
          </Link>

          <div className="order-last -mx-5 w-[calc(100%+2.5rem)] border-t border-border/40 px-5 pt-3 sm:-mx-8 sm:w-[calc(100%+4rem)] sm:px-8 md:order-none md:mx-0 md:w-auto md:border-0 md:p-0">
            <AgentsNav canExport={hasNominations} />
          </div>

          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm leading-tight text-text">{session.full_name}</p>
              <p className="max-w-56 truncate text-xs text-text-muted">{session.office}</p>
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
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-5 py-8 sm:px-8">{children}</main>
    </div>
  );
}
