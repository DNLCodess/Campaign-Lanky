import { requireAdmin } from "@/lib/admin-auth";
import { getTeamLeaders, getAllConstituencyGeo, type TeamLeaderLevel } from "@/lib/team-leaders";
import { LeaderForm } from "@/app/admin/(dashboard)/team-leaders/leader-form";
import { LeaderRow, LeaderCard } from "@/app/admin/(dashboard)/team-leaders/leader-row";

export const dynamic = "force-dynamic";

const LEVEL_LABELS: Record<TeamLeaderLevel, string> = {
  constituency: "Constituency-wide",
  lga: "LGA",
  ward: "Ward",
  polling_unit: "Polling Unit",
};

export default async function TeamLeadersPage({
  searchParams,
}: {
  searchParams: Promise<{ level?: string; lga?: string }>;
}) {
  await requireAdmin();
  const { level, lga } = await searchParams;

  const [leaders, geo] = await Promise.all([getTeamLeaders({ level, lga }), getAllConstituencyGeo()]);
  const lgas = Array.from(new Set(geo.map((g) => g.lga)));

  const exportHref = (() => {
    const params = new URLSearchParams();
    if (level) params.set("level", level);
    if (lga) params.set("lga", lga);
    const qs = params.toString();
    return `/admin/team-leaders/export${qs ? `?${qs}` : ""}`;
  })();

  const filterHref = (nextLevel?: string, nextLga?: string) => {
    const params = new URLSearchParams();
    if (nextLevel) params.set("level", nextLevel);
    if (nextLga) params.set("lga", nextLga);
    const qs = params.toString();
    return `/admin/team-leaders${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div>
          <h1 className="font-heading text-2xl text-text">Team Leaders</h1>
          <p className="text-sm text-text-muted">
            Campaign ground organization — Constituency, LGA, Ward, and Polling Unit leaders.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={exportHref}
            className="rounded-brand border border-border px-4 py-2 text-sm text-text-muted transition-colors hover:border-accent hover:text-text"
          >
            Export CSV{level || lga ? " (filtered)" : " (all)"}
          </a>
          <a
            href="/admin/team-leaders/export-all"
            className="rounded-brand border border-accent/50 px-4 py-2 text-sm text-accent transition-colors hover:bg-accent/10"
          >
            Export ALL Team Members
          </a>
        </div>
      </header>
      <p className="mt-2 text-xs text-text-muted">
        &quot;Export ALL Team Members&quot; combines this leader directory with the election-portal
        accounts (LGA coordinators, ward agents, PU agents) into one roster.
      </p>

      {/* Filters */}
      <div className="mt-6 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-text-muted">Level:</span>
        <FilterLink href={filterHref(undefined, lga)} active={!level}>
          All
        </FilterLink>
        {(Object.keys(LEVEL_LABELS) as TeamLeaderLevel[]).map((l) => (
          <FilterLink key={l} href={filterHref(l, lga)} active={level === l}>
            {LEVEL_LABELS[l]}
          </FilterLink>
        ))}
        <span className="ml-4 text-text-muted">LGA:</span>
        <FilterLink href={filterHref(level, undefined)} active={!lga}>
          All
        </FilterLink>
        {lgas.map((l) => (
          <FilterLink key={l} href={filterHref(level, l)} active={lga === l}>
            {l}
          </FilterLink>
        ))}
      </div>

      {/* Add leader */}
      <section className="mt-8 rounded-brand border border-border bg-surface/40 p-6">
        <h2 className="font-heading text-lg text-text">Add a team leader</h2>
        <div className="mt-5">
          <LeaderForm geo={geo} />
        </div>
      </section>

      {/* Existing leaders */}
      <section className="mt-8">
        <h2 className="font-heading text-lg text-text">Leaders ({leaders.length})</h2>

        {leaders.length === 0 ? (
          <div className="mt-3 rounded-brand border border-border bg-surface/30 px-4 py-12 text-center text-text-muted">
            No team leaders match this filter.
          </div>
        ) : (
          <>
            <div className="mt-3 hidden overflow-x-auto rounded-brand border border-border md:block">
              <table className="w-full min-w-160 text-left text-sm">
                <thead>
                  <tr className="bg-surface/60 text-xs uppercase tracking-wide text-text-muted">
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Title</th>
                    <th className="px-4 py-3 font-medium">Level</th>
                    <th className="px-4 py-3 font-medium">Phone</th>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium" />
                  </tr>
                </thead>
                <tbody className="text-text-muted">
                  {leaders.map((l) => (
                    <LeaderRow key={l.id} leader={l} geo={geo} />
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-3 space-y-3 md:hidden">
              {leaders.map((l) => (
                <LeaderCard key={l.id} leader={l} geo={geo} />
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function FilterLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className={`rounded-brand border px-3 py-1.5 text-xs transition-colors ${
        active
          ? "border-accent bg-accent/15 text-text"
          : "border-border text-text-muted hover:border-accent hover:text-text"
      }`}
    >
      {children}
    </a>
  );
}
