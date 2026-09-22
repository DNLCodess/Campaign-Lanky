import Link from "next/link";
import { requireCandidateSession } from "@/lib/agents/session";
import { listCandidateNominations, countCandidateNominations } from "@/lib/agents/nominations";
import { agentsPath } from "@/lib/agents/routes";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

function buildUrl(page: number, q: string, duplicatesOnly: boolean): string {
  const params = new URLSearchParams();
  if (page > 1) params.set("page", String(page));
  if (q) params.set("q", q);
  if (duplicatesOnly) params.set("duplicates", "1");
  const qs = params.toString();
  return agentsPath(qs ? `/?${qs}` : "/");
}

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" });

const fullNameOf = (r: { first_name: string; other_names: string | null; surname: string }) =>
  [r.first_name, r.other_names, r.surname].filter(Boolean).join(" ");

export default async function AgentsDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; duplicates?: string; page?: string }>;
}) {
  const session = await requireCandidateSession();
  const sp = await searchParams;
  const q = (sp.q ?? "").toString();
  const duplicatesOnly = sp.duplicates === "1";
  const page = Math.max(1, Number(sp.page) || 1);

  const { rows, total } = await listCandidateNominations(session.id, {
    q,
    duplicatesOnly,
    page,
    pageSize: PAGE_SIZE,
  });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasAnyNominations = (await countCandidateNominations(session.id)) > 0;

  return (
    <div>
      <header className="flex flex-col gap-3 border-b border-border/60 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl text-text">Nominations</h1>
          <p className="text-sm text-text-muted">Polling Unit Agents submitted under your candidacy.</p>
        </div>
        {hasAnyNominations && (
          <a
            href={agentsPath("/export")}
            className="shrink-0 rounded-brand border border-border px-3.5 py-2 text-sm text-text-muted transition-colors hover:border-accent hover:text-text"
          >
            Export all as ZIP
          </a>
        )}
      </header>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form method="get" className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search name, phone, email, reference…"
            className="w-full rounded-brand border border-border bg-bg px-4 py-2 text-sm text-text focus:border-accent focus:outline-none sm:w-64"
          />
          <label className="flex items-center gap-2 text-sm text-text-muted">
            <input
              type="checkbox"
              name="duplicates"
              value="1"
              defaultChecked={duplicatesOnly}
              className="h-4 w-4 rounded border-border accent-primary"
            />
            Possible duplicates only
          </label>
          <button
            type="submit"
            className="shrink-0 rounded-brand border border-border px-3 py-2 text-sm text-text-muted transition-colors hover:border-accent hover:text-text"
          >
            Search
          </button>
          {(q || duplicatesOnly) && (
            <Link href={agentsPath("/")} className="shrink-0 text-sm text-text-muted hover:text-text">
              Clear
            </Link>
          )}
        </form>
      </div>

      {rows.length === 0 && (
        <div className="mt-4 rounded-brand border border-border bg-surface/30 px-4 py-12 text-center text-text-muted">
          {q || duplicatesOnly ? "No matching nominations." : "No nominations submitted yet."}
        </div>
      )}

      {rows.length > 0 && (
        <div className="mt-4 hidden overflow-x-auto rounded-brand border border-border md:block">
          <table className="w-full min-w-160 text-left text-sm">
            <thead>
              <tr className="bg-surface/60 text-xs uppercase tracking-wide text-text-muted">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Polling Unit</th>
                <th className="px-4 py-3 font-medium">Submitted</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="text-text-muted">
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border/40">
                  <td className="px-4 py-3 align-top text-text">
                    {fullNameOf(r)}
                    {r.is_possible_duplicate && (
                      <span className="ml-2 rounded-full bg-yellow-500/15 px-2 py-0.5 text-xs text-yellow-300">
                        Possible duplicate
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top">{r.phone}</td>
                  <td className="px-4 py-3 align-top">
                    {r.polling_unit_code} — {r.polling_unit_name}
                  </td>
                  <td className="px-4 py-3 align-top">{when(r.created_at)}</td>
                  <td className="px-4 py-3 align-top text-right">
                    <Link
                      href={agentsPath(`/nominations/${r.id}`)}
                      className="text-accent underline underline-offset-2 hover:text-text"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {rows.length > 0 && (
        <div className="mt-4 space-y-3 md:hidden">
          {rows.map((r) => (
            <Link
              key={r.id}
              href={agentsPath(`/nominations/${r.id}`)}
              className="block rounded-brand border border-border bg-surface/40 p-4"
            >
              <p className="font-medium text-text">{fullNameOf(r)}</p>
              {r.is_possible_duplicate && (
                <span className="mt-1 inline-block rounded-full bg-yellow-500/15 px-2 py-0.5 text-xs text-yellow-300">
                  Possible duplicate
                </span>
              )}
              <div className="mt-3 space-y-1.5 border-t border-border/40 pt-3 text-xs text-text-muted">
                <p>{r.phone}</p>
                <p>
                  {r.polling_unit_code} — {r.polling_unit_name}
                </p>
                <p>{when(r.created_at)}</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-col items-center justify-between gap-3 text-sm text-text-muted sm:flex-row">
        <span>
          {total === 0
            ? "0 nominations"
            : `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} of ${total}`}
        </span>
        <div className="flex gap-2">
          <PageLink disabled={page <= 1} href={buildUrl(page - 1, q, duplicatesOnly)}>
            ← Prev
          </PageLink>
          <span className="px-2 py-1.5">
            {page} / {totalPages}
          </span>
          <PageLink disabled={page >= totalPages} href={buildUrl(page + 1, q, duplicatesOnly)}>
            Next →
          </PageLink>
        </div>
      </div>
    </div>
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
