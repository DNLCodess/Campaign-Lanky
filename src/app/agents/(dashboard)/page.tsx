import Link from "next/link";
import { requireCandidateSession } from "@/lib/agents/session";
import {
  listCandidateNominations,
  getCandidateNominationStats,
  type NominationSort,
} from "@/lib/agents/nominations";
import { agentsPath } from "@/lib/agents/routes";
import { formatPollingUnitCode } from "@/lib/agents/format";
import { ShareLink } from "@/app/agents/(dashboard)/share-link";
import { ClickableRow } from "@/app/agents/(dashboard)/clickable-row";
import { NominationFilters } from "@/app/agents/(dashboard)/nomination-filters";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;
const SORTS: NominationSort[] = ["newest", "oldest", "name", "unit"];

type Filters = { q: string; duplicates: boolean; ward?: number; sort: string };

function buildUrl(page: number, f: Filters): string {
  const params = new URLSearchParams();
  if (page > 1) params.set("page", String(page));
  if (f.q) params.set("q", f.q);
  if (f.duplicates) params.set("duplicates", "1");
  if (f.ward !== undefined) params.set("ward", String(f.ward));
  if (f.sort && f.sort !== "newest") params.set("sort", f.sort);
  const qs = params.toString();
  return agentsPath(qs ? `/?${qs}` : "/");
}

const dateOf = (iso: string) =>
  new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
const timeOf = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-NG", { hour: "numeric", minute: "2-digit" });

const fullNameOf = (r: { first_name: string; other_names: string | null; surname: string }) =>
  [r.first_name, r.other_names, r.surname].filter(Boolean).join(" ");

export default async function AgentsDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; duplicates?: string; page?: string; ward?: string; sort?: string }>;
}) {
  const session = await requireCandidateSession();
  const sp = await searchParams;
  const wardNum = Number(sp.ward);
  const filters: Filters = {
    q: (sp.q ?? "").toString().trim(),
    duplicates: sp.duplicates === "1",
    ward: sp.ward && Number.isInteger(wardNum) ? wardNum : undefined,
    sort: SORTS.includes(sp.sort as NominationSort) ? (sp.sort as string) : "newest",
  };
  const page = Math.max(1, Number(sp.page) || 1);

  const [{ rows, total }, stats] = await Promise.all([
    listCandidateNominations(session.id, {
      q: filters.q,
      duplicatesOnly: filters.duplicates,
      ward: filters.ward,
      sort: filters.sort as NominationSort,
      page,
      pageSize: PAGE_SIZE,
    }),
    getCandidateNominationStats(session.id),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const isFiltered = Boolean(filters.q || filters.duplicates || filters.ward !== undefined);

  return (
    <div>
      <ShareLink slug={session.slug} name={session.full_name} />

      <header>
        <div>
          <h1 className="font-heading text-2xl text-text">Polling Unit Agents</h1>
          <p className="text-sm text-text-muted">
            Everyone who has submitted their details under your candidacy.
          </p>
        </div>
      </header>

      {stats.total > 0 && (
        <dl className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-brand border border-border bg-border sm:grid-cols-3">
          <Stat label="Agents submitted" value={stats.total} />
          <Stat label="Polling units covered" value={stats.pollingUnits} />
          <Stat
            label="Possible duplicates"
            value={stats.duplicates}
            href={stats.duplicates > 0 ? buildUrl(1, { ...filters, duplicates: !filters.duplicates }) : undefined}
            active={filters.duplicates}
          />
        </dl>
      )}

      {stats.total > 0 && (
        <div className="mt-5">
          <NominationFilters wards={stats.wards} />
        </div>
      )}

      {stats.total > 0 && (
        <p className="mt-4 text-sm text-text-muted" aria-live="polite">
          {isFiltered
            ? `${total} of ${stats.total} agents`
            : `${stats.total} ${stats.total === 1 ? "agent" : "agents"}`}
          {filters.duplicates && " · possible duplicates only"}
          {isFiltered && (
            <Link href={agentsPath("/")} className="ml-3 text-accent underline underline-offset-2">
              Clear filters
            </Link>
          )}
        </p>
      )}

      {stats.total === 0 && (
        <div className="mt-6 rounded-brand border border-dashed border-border px-4 py-12 text-center">
          <p className="font-medium text-text">No agents have submitted yet</p>
          <p className="mt-1 text-sm text-text-muted">
            Send the link above to your Polling Unit Agents. Each submission shows up here.
          </p>
        </div>
      )}

      {stats.total > 0 && rows.length === 0 && (
        <div className="mt-3 rounded-brand border border-dashed border-border px-4 py-10 text-center text-sm text-text-muted">
          No agents match these filters.
        </div>
      )}

      {rows.length > 0 && (
        <div className="mt-3 overflow-hidden rounded-brand border border-border">
          <table className="w-full text-left text-sm">
            <thead className="hidden bg-surface/60 text-xs text-text-muted md:table-header-group">
              <tr>
                <th className="px-4 py-2.5 font-medium">Agent</th>
                <th className="px-4 py-2.5 font-medium">Phone</th>
                <th className="px-4 py-2.5 font-medium">Polling unit</th>
                <th className="px-4 py-2.5 font-medium">Submitted</th>
                <th className="w-20 px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <ClickableRow
                  key={r.id}
                  href={agentsPath(`/nominations/${r.id}`)}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 px-4 py-3 hover:bg-surface/40 md:table-row md:px-0 md:py-0"
                >
                  <td className="col-start-1 row-start-1 md:table-cell md:px-4 md:py-2.5">
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-medium text-text">
                      <Link
                        href={agentsPath(`/nominations/${r.id}`)}
                        className="hover:text-accent hover:underline"
                      >
                        {fullNameOf(r)}
                      </Link>
                      {r.is_possible_duplicate && (
                        <span className="rounded-full bg-yellow-500/15 px-2 py-0.5 text-xs font-normal text-yellow-300">
                          Possible duplicate
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-text-muted">Ref {r.reference_id}</p>
                  </td>
                  <td className="col-start-1 row-start-2 mt-1 text-text-muted md:table-cell md:px-4 md:py-2.5">
                    <a href={`tel:${r.phone}`} className="hover:text-text hover:underline">
                      {r.phone}
                    </a>
                  </td>
                  <td className="col-start-1 row-start-3 mt-0.5 min-w-0 text-text-muted md:table-cell md:px-4 md:py-2.5">
                    <p className="truncate md:max-w-64" title={r.polling_unit_name}>
                      {r.polling_unit_name}
                    </p>
                    <p className="text-xs text-text-muted/80">
                      Ward {r.ward} · {formatPollingUnitCode(r.polling_unit_code)}
                    </p>
                  </td>
                  <td className="col-start-1 row-start-4 mt-1 text-xs text-text-muted md:table-cell md:px-4 md:py-2.5 md:text-sm">
                    {dateOf(r.created_at)}
                    <span className="hidden text-xs text-text-muted/80 md:block">
                      {timeOf(r.created_at)}
                    </span>
                  </td>
                  <td className="col-start-2 row-span-4 row-start-1 md:table-cell md:px-4 md:py-2.5 md:text-right">
                    <Link
                      href={agentsPath(`/nominations/${r.id}`)}
                      className="rounded-brand border border-border px-3 py-1.5 text-sm text-text transition-colors hover:border-accent"
                    >
                      View
                    </Link>
                  </td>
                </ClickableRow>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {total > 0 && (
        <div className="mt-4 flex flex-col items-center justify-between gap-3 text-sm text-text-muted sm:flex-row">
          <span>
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
          </span>
          <div className="flex items-center gap-2">
            <PageLink disabled={page <= 1} href={buildUrl(1, filters)}>
              « First
            </PageLink>
            <PageLink disabled={page <= 1} href={buildUrl(page - 1, filters)}>
              ‹ Prev
            </PageLink>
            <span className="px-2 py-1.5">
              Page {page} of {totalPages}
            </span>
            <PageLink disabled={page >= totalPages} href={buildUrl(page + 1, filters)}>
              Next ›
            </PageLink>
            <PageLink disabled={page >= totalPages} href={buildUrl(totalPages, filters)}>
              Last »
            </PageLink>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  href,
  active,
}: {
  label: string;
  value: number;
  href?: string;
  active?: boolean;
}) {
  const body = (
    <>
      <dt className="text-xs text-text-muted">{label}</dt>
      <dd className="mt-0.5 font-heading text-2xl text-text">{value}</dd>
      {href && (
        <p className="mt-0.5 text-xs text-accent">{active ? "Show all" : "Review these"}</p>
      )}
    </>
  );
  const cls = "bg-bg px-4 py-3";
  return href ? (
    <Link href={href} className={`${cls} block transition-colors hover:bg-surface/40`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

function PageLink({
  href,
  disabled,
  children,
}: {
  href: string;
  disabled: boolean;
  children: React.ReactNode;
}) {
  if (disabled) {
    return <span className="rounded-brand border border-border/40 px-3 py-1.5 opacity-40">{children}</span>;
  }
  return (
    <Link
      href={href}
      className="rounded-brand border border-border px-3 py-1.5 transition-colors hover:border-accent hover:text-text"
    >
      {children}
    </Link>
  );
}
