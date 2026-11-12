import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import {
  fullNameOf,
  getAdminNominationStats,
  getFilePaths,
  listAdminCandidates,
  listAdminNominations,
  OUR_CANDIDATE_SLUG,
  pickCandidate,
  signedUrlsFor,
} from "@/lib/agents/admin-nominations";
import { formatPollingUnitCode } from "@/lib/agents/format";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

type Filters = { candidate: string; q: string; ward?: number };

function buildUrl(page: number, f: Filters): string {
  const params = new URLSearchParams();
  if (f.candidate !== OUR_CANDIDATE_SLUG) params.set("candidate", f.candidate);
  if (f.q) params.set("q", f.q);
  if (f.ward !== undefined) params.set("ward", String(f.ward));
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return `/admin/agent-nominations/agents${qs ? `?${qs}` : ""}`;
}

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" });

export default async function AdminAgentsPage({
  searchParams,
}: {
  searchParams: Promise<{ candidate?: string; q?: string; ward?: string; page?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;

  const candidates = await listAdminCandidates();
  const candidate = pickCandidate(candidates, sp.candidate);

  if (!candidate) {
    return (
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        <h1 className="font-heading text-2xl text-text">Polling Unit Agents</h1>
        <p className="mt-4 text-sm text-text-muted">No candidates have been set up yet.</p>
      </div>
    );
  }

  const wardNum = Number(sp.ward);
  const filters: Filters = {
    candidate: candidate.slug,
    q: (sp.q ?? "").toString().trim(),
    ward: sp.ward && Number.isInteger(wardNum) ? wardNum : undefined,
  };
  const page = Math.max(1, Number(sp.page) || 1);

  const [{ rows, total }, stats] = await Promise.all([
    listAdminNominations(candidate.id, { q: filters.q, ward: filters.ward, page, pageSize: PAGE_SIZE }),
    getAdminNominationStats(candidate.id),
  ]);
  const signatureUrls = await signedUrlsFor(await getFilePaths(rows.map((r) => r.id), "specimen_signature"));
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const isFiltered = Boolean(filters.q || filters.ward !== undefined);

  const candidateQs = candidate.slug !== OUR_CANDIDATE_SLUG ? `candidate=${candidate.slug}` : "";
  const zipQs = [candidateQs, filters.ward !== undefined ? `ward=${filters.ward}` : ""].filter(Boolean).join("&");

  return (
    <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
      <header className="flex flex-col gap-4 border-b border-border/60 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-heading text-2xl text-text">Polling Unit Agents</h1>
          <p className="mt-1 text-sm text-text-muted">
            {candidate.full_name} · {candidate.office}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={`/admin/agent-files/signature${zipQs ? `?${zipQs}` : ""}`}
            className="rounded-brand bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
          >
            {filters.ward !== undefined ? `Ward ${filters.ward} ` : "All "}signatures (PNG, ZIP)
          </a>
          <a
            href={`/admin/agent-files/id${zipQs ? `?${zipQs}` : ""}`}
            className="rounded-brand border border-border px-4 py-2.5 text-sm text-text transition-colors hover:border-accent"
          >
            {filters.ward !== undefined ? `Ward ${filters.ward} ` : "All "}ID documents (ZIP)
          </a>
          <a
            href={`/admin/agent-files/photo${zipQs ? `?${zipQs}` : ""}`}
            className="rounded-brand border border-border px-4 py-2.5 text-sm text-text transition-colors hover:border-accent"
          >
            {filters.ward !== undefined ? `Ward ${filters.ward} ` : "All "}passport photos (ZIP)
          </a>
          <a
            href={`/admin/agent-files/csv${candidateQs ? `?${candidateQs}` : ""}`}
            className="rounded-brand border border-border px-4 py-2.5 text-sm text-text transition-colors hover:border-accent"
          >
            Export CSV
          </a>
        </div>
      </header>

      {/* Candidate + filters */}
      <form method="get" className="mt-6 grid gap-3 sm:grid-cols-[minmax(0,1fr)_10rem_minmax(0,1fr)_auto] sm:items-end">
        <label className="block text-xs text-text-muted">
          Candidate
          <select
            name="candidate"
            defaultValue={candidate.slug}
            className="mt-1 w-full rounded-brand border border-border bg-bg px-3 py-2 text-sm text-text focus:border-accent focus:outline-none"
          >
            {candidates.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.full_name}
                {c.slug === OUR_CANDIDATE_SLUG ? " (ours)" : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs text-text-muted">
          Ward
          <select
            name="ward"
            defaultValue={filters.ward !== undefined ? String(filters.ward) : ""}
            className="mt-1 w-full rounded-brand border border-border bg-bg px-3 py-2 text-sm text-text focus:border-accent focus:outline-none"
          >
            <option value="">All wards</option>
            {stats.wards.map((w) => (
              <option key={w} value={w}>
                Ward {w}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs text-text-muted">
          Search
          <input
            type="search"
            name="q"
            defaultValue={filters.q}
            placeholder="Name, phone, email, reference, polling unit…"
            className="mt-1 w-full rounded-brand border border-border bg-bg px-3 py-2 text-sm text-text focus:border-accent focus:outline-none"
          />
        </label>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="rounded-brand border border-border px-4 py-2 text-sm text-text transition-colors hover:border-accent"
          >
            Apply
          </button>
          {isFiltered && (
            <Link
              href={buildUrl(1, { candidate: candidate.slug, q: "" })}
              className="text-sm text-text-muted hover:text-text"
            >
              Clear
            </Link>
          )}
        </div>
      </form>

      {/* Summary */}
      <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-brand border border-border bg-border sm:grid-cols-5">
        <Stat label="Agents submitted" value={stats.total} />
        <Stat label="Polling units covered" value={stats.pollingUnits} />
        <Stat label="Wards covered" value={stats.wards.length} />
        <Stat label="Possible duplicates" value={stats.duplicates} />
        <Stat label="Outside area" value={stats.outsideArea} />
      </dl>

      <p className="mt-5 text-sm text-text-muted" aria-live="polite">
        {isFiltered ? `${total} of ${stats.total} agents` : `${stats.total} ${stats.total === 1 ? "agent" : "agents"}`} ·
        sorted by ward, then polling unit
      </p>

      {rows.length === 0 && (
        <div className="mt-3 rounded-brand border border-dashed border-border px-4 py-12 text-center text-sm text-text-muted">
          {stats.total === 0 ? "No agents have submitted yet." : "No agents match these filters."}
        </div>
      )}

      {rows.length > 0 && (
        <div className="mt-3 overflow-x-auto rounded-brand border border-border">
          <table className="w-full min-w-240 text-left text-sm">
            <thead className="bg-surface/60 text-xs uppercase tracking-wide text-text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Form</th>
                <th className="px-4 py-3 font-medium">Agent</th>
                <th className="px-4 py-3 font-medium">Contact</th>
                <th className="px-4 py-3 font-medium">Ward / Polling unit</th>
                <th className="px-4 py-3 font-medium">Submitted</th>
                <th className="px-4 py-3 font-medium">Signature</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 text-text-muted">
              {rows.map((r) => {
                const sig = signatureUrls.get(r.id);
                return (
                  <tr key={r.id} className="align-top hover:bg-surface/30">
                    <td className="px-4 py-3">
                      <p className="font-mono text-text">#{r.form_no}</p>
                      <p className="text-xs">{r.reference_id}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/agent-nominations/agents/${r.id}`}
                        className="font-medium text-text hover:text-accent hover:underline"
                      >
                        {fullNameOf(r)}
                      </Link>
                      <p className="text-xs">
                        {r.gender === "male" ? "Male" : "Female"} · ID: {r.means_of_id}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {r.is_possible_duplicate && (
                          <span className="rounded-full bg-yellow-500/15 px-2 py-0.5 text-xs text-yellow-300">
                            Possible duplicate
                          </span>
                        )}
                        {r.is_outside_area && (
                          <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs text-primary">
                            Outside area
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <a href={`tel:${r.phone}`} className="block text-text hover:underline">
                        {r.phone}
                      </a>
                      {r.email && <p className="max-w-48 truncate text-xs" title={r.email}>{r.email}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-text">
                        Ward {r.ward} · {formatPollingUnitCode(r.polling_unit_code)}
                      </p>
                      <p className="max-w-64 truncate text-xs" title={r.polling_unit_name}>
                        {r.polling_unit_name}
                      </p>
                      <p className="text-xs">{r.lga}</p>
                    </td>
                    <td className="px-4 py-3 text-xs">{when(r.created_at)}</td>
                    <td className="px-4 py-3">
                      {sig ? (
                        // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL
                        <img
                          src={sig}
                          alt={`Signature of ${fullNameOf(r)}`}
                          className="h-12 w-32 rounded border border-border bg-white object-contain p-1"
                        />
                      ) : (
                        <span className="text-xs">Missing</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-col items-end gap-1.5">
                        {sig && (
                          <a
                            href={`/admin/agent-files/signature/${r.id}`}
                            className="whitespace-nowrap rounded-brand border border-border px-3 py-1.5 text-xs text-text transition-colors hover:border-accent"
                          >
                            Download PNG
                          </a>
                        )}
                        <Link
                          href={`/admin/agent-nominations/agents/${r.id}`}
                          className="text-xs text-accent underline underline-offset-2"
                        >
                          Full details
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {total > PAGE_SIZE && (
        <div className="mt-4 flex items-center justify-between text-sm text-text-muted">
          <span>
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
          </span>
          <div className="flex gap-2">
            <PageLink disabled={page <= 1} href={buildUrl(page - 1, filters)}>
              ← Prev
            </PageLink>
            <span className="px-2 py-1.5">
              {page} / {totalPages}
            </span>
            <PageLink disabled={page >= totalPages} href={buildUrl(page + 1, filters)}>
              Next →
            </PageLink>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-bg px-4 py-3">
      <dt className="text-xs text-text-muted">{label}</dt>
      <dd className="mt-0.5 font-heading text-xl text-text">{value}</dd>
    </div>
  );
}

function PageLink({ disabled, href, children }: { disabled: boolean; href: string; children: React.ReactNode }) {
  if (disabled) {
    return <span className="rounded-brand border border-border/50 px-3 py-1.5 opacity-40">{children}</span>;
  }
  return (
    <Link href={href} className="rounded-brand border border-border px-3 py-1.5 hover:border-accent hover:text-text">
      {children}
    </Link>
  );
}
