import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { logout } from "@/app/admin/actions";
import {
  ADMIN_TABLE_ORDER,
  ADMIN_TABLES,
  isAdminTable,
  searchExpression,
  type AdminTableKey,
} from "@/lib/admin-tables";
import { DonationProgressBar } from "@/components/donation-progress-bar";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;
const naira = (n: unknown) => `₦${Number(n).toLocaleString("en-NG")}`;
const when = (iso: unknown) =>
  new Date(String(iso)).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" });

type Row = Record<string, unknown>;

function buildUrl(view: AdminTableKey, page: number, q: string) {
  const params = new URLSearchParams({ view });
  if (page > 1) params.set("page", String(page));
  if (q) params.set("q", q);
  return `/admin?${params.toString()}`;
}

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; page?: string; q?: string }>;
}) {
  const user = await requireAdmin();
  const sp = await searchParams;

  const view: AdminTableKey = isAdminTable(sp.view ?? "") ? (sp.view as AdminTableKey) : "donations";
  const q = (sp.q ?? "").toString();
  const page = Math.max(1, Number(sp.page) || 1);

  let configured = true;
  const counts: Record<AdminTableKey, number> = {
    voter_registrations: 0,
    donations: 0,
    volunteers: 0,
    leads: 0,
    dp_supporters: 0,
    messages: 0,
  };
  let raised = 0;
  let successfulCount = 0;
  let firstDonationAt: string | null = null;
  let rows: Row[] = [];
  let total = 0;

  try {
    const supabase = createAdminSupabase();

    const countOf = async (t: AdminTableKey) => {
      const { count } = await supabase.from(t).select("*", { count: "exact", head: true });
      return count ?? 0;
    };
    const [vrc, dc, vc, lc, dpc, mc, successful, firstDonation] = await Promise.all([
      countOf("voter_registrations"),
      countOf("donations"),
      countOf("volunteers"),
      countOf("leads"),
      countOf("dp_supporters"),
      countOf("messages"),
      supabase.from("donations").select("amount").eq("status", "successful").limit(10000),
      supabase
        .from("donations")
        .select("created_at")
        .eq("status", "successful")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle(),
    ]);
    counts.voter_registrations = vrc;
    counts.donations = dc;
    counts.volunteers = vc;
    counts.leads = lc;
    counts.dp_supporters = dpc;
    counts.messages = mc;
    const sRows = (successful.data ?? []) as { amount: number }[];
    successfulCount = sRows.length;
    raised = sRows.reduce((s, r) => s + Number(r.amount), 0);
    firstDonationAt = (firstDonation.data as { created_at: string } | null)?.created_at ?? null;

    // Active table page (with optional search).
    let query = supabase
      .from(view)
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
    const expr = searchExpression(view, q);
    if (expr) query = query.or(expr);
    const { data, count } = await query;
    rows = (data ?? []) as Row[];
    total = count ?? 0;
  } catch (err) {
    console.error("[admin] data load failed", err);
    configured = false;
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
      {/* Top bar */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div>
          <h1 className="font-heading text-2xl text-text">Campaign Admin</h1>
          <p className="text-sm text-text-muted">{user.email}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/blog"
            className="rounded-brand bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
          >
            Blog posts
          </Link>
          <Link
            href="/admin/team"
            className="rounded-brand border border-border px-4 py-2 text-sm text-text-muted transition-colors hover:border-accent hover:text-text"
          >
            Admin team
          </Link>
          <form action={logout}>
            <button
              type="submit"
              className="rounded-brand border border-border px-4 py-2 text-sm text-text-muted transition-colors hover:border-accent hover:text-text"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      {!configured && (
        <p className="mt-6 rounded-brand border border-primary/40 bg-primary/10 p-4 text-sm text-text">
          Data source not configured. Set <code>SUPABASE_SERVICE_ROLE_KEY</code> to
          load submissions.
        </p>
      )}

      {/* Stat cards */}
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <Stat label="Voter cards" value={String(counts.voter_registrations)} sub="registrations" />
        <Stat label="Total raised" value={naira(raised)} sub={`${successfulCount} donations`} />
        <Stat label="Supporters" value={String(counts.leads)} sub="email / phone signups" />
        <Stat label="Volunteers" value={String(counts.volunteers)} sub="sign-ups" />
        <Stat label="Messages" value={String(counts.messages)} sub="contact form" />
      </div>

      {/* Campaign goal section */}
      <div className="mt-8 rounded-brand border border-border bg-surface/30 p-6 sm:p-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-heading text-xl text-text">Campaign fundraising goal</h2>
            <p className="mt-0.5 text-sm text-text-muted">Target: ₦100,000,000</p>
          </div>
          {configured && successfulCount > 0 && firstDonationAt && (
            <GoalVelocity raised={raised} firstDonationAt={firstDonationAt} />
          )}
        </div>
        {configured ? (
          <DonationProgressBar raised={raised} count={successfulCount} variant="full" />
        ) : (
          <p className="text-sm text-text-muted/60">Configure Supabase to see live goal progress.</p>
        )}
      </div>

      {/* Tabs */}
      <nav className="mt-10 flex gap-1 overflow-x-auto border-b border-border/60">
        {ADMIN_TABLE_ORDER.map((t) => {
          const active = t === view;
          return (
            <Link
              key={t}
              href={buildUrl(t, 1, "")}
              className={`-mb-px shrink-0 whitespace-nowrap rounded-t-brand border-b-2 px-4 py-2.5 text-sm transition-colors ${
                active
                  ? "border-primary text-text"
                  : "border-transparent text-text-muted hover:text-text"
              }`}
            >
              {ADMIN_TABLES[t].label}{" "}
              <span className="text-text-muted">({counts[t]})</span>
            </Link>
          );
        })}
      </nav>

      {/* Search + export */}
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form method="get" className="flex w-full items-center gap-2 sm:w-auto">
          <input type="hidden" name="view" value={view} />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder={`Search ${ADMIN_TABLES[view].label.toLowerCase()}…`}
            className="w-full rounded-brand border border-border bg-bg px-4 py-2 text-sm text-text focus:border-accent focus:outline-none sm:w-56"
          />
          <button
            type="submit"
            className="shrink-0 rounded-brand border border-border px-3 py-2 text-sm text-text-muted transition-colors hover:border-accent hover:text-text"
          >
            Search
          </button>
          {q && (
            <Link
              href={buildUrl(view, 1, "")}
              className="shrink-0 text-sm text-text-muted hover:text-text"
            >
              Clear
            </Link>
          )}
        </form>
        <a
          href={`/admin/export/${view}${q ? `?q=${encodeURIComponent(q)}` : ""}`}
          className="rounded-brand bg-primary px-4 py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-primary-hover"
        >
          Export CSV
        </a>
      </div>

      {/* Empty state */}
      {rows.length === 0 && (
        <div className="mt-4 rounded-brand border border-border bg-surface/30 px-4 py-12 text-center text-text-muted">
          {q ? "No matching records." : "No records yet."}
        </div>
      )}

      {/* Table (md+) */}
      {rows.length > 0 && (
        <div className="mt-4 hidden overflow-x-auto rounded-brand border border-border md:block">
          <table className="w-full min-w-160 text-left text-sm">
            <thead>
              <tr className="bg-surface/60 text-xs uppercase tracking-wide text-text-muted">
                {headsFor(view).map((h) => (
                  <th key={h} className="px-4 py-3 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="text-text-muted">
              {rows.map((r, i) => (
                <RowView key={(r.id as string) ?? i} view={view} r={r} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Cards (mobile) */}
      {rows.length > 0 && (
        <div className="mt-4 space-y-3 md:hidden">
          {rows.map((r, i) => (
            <MobileCard key={(r.id as string) ?? i} view={view} r={r} />
          ))}
        </div>
      )}

      {/* Pagination */}
      <div className="mt-4 flex flex-col items-center justify-between gap-3 text-sm text-text-muted sm:flex-row">
        <span>
          {total === 0
            ? "0 records"
            : `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} of ${total}`}
        </span>
        <div className="flex gap-2">
          <PageLink disabled={page <= 1} href={buildUrl(view, page - 1, q)}>
            ← Prev
          </PageLink>
          <span className="px-2 py-1.5">
            {page} / {totalPages}
          </span>
          <PageLink disabled={page >= totalPages} href={buildUrl(view, page + 1, q)}>
            Next →
          </PageLink>
        </div>
      </div>
    </div>
  );
}

function headsFor(view: AdminTableKey): string[] {
  switch (view) {
    case "voter_registrations":
      return ["Date", "Name", "DOB", "Mobile", "NIN", "Ward", "Polling unit", "LGA"];
    case "donations":
      return ["Date", "Donor", "Amount", "Status", "Method"];
    case "volunteers":
      return ["Date", "Name", "Phone", "Ward", "Interests"];
    case "leads":
      return ["Date", "Email", "Phone", "Source"];
    case "dp_supporters":
      return ["Date", "Name", "Email"];
    case "messages":
      return ["Date", "From", "Message"];
  }
}

function RowView({ view, r }: { view: AdminTableKey; r: Row }) {
  if (view === "voter_registrations") {
    const fullName = [r.surname, r.first_name, r.middle_name]
      .filter(Boolean)
      .join(" ");
    return (
      <tr className="border-t border-border/40">
        <Td>{when(r.created_at)}</Td>
        <Td className="text-text">{fullName}</Td>
        <Td>{String(r.date_of_birth ?? "—")}</Td>
        <Td>{String(r.mobile ?? "")}</Td>
        <Td className="font-mono text-xs">{String(r.nin ?? "—")}</Td>
        <Td>{String(r.ward ?? "—")}</Td>
        <Td>{String(r.polling_unit ?? "—")}</Td>
        <Td>{String(r.lga_of_residence ?? "—")}</Td>
      </tr>
    );
  }
  if (view === "donations") {
    return (
      <tr className="border-t border-border/40">
        <Td>{when(r.created_at)}</Td>
        <Td>
          <span className="text-text">{String(r.donor_name ?? "")}</span>
          <span className="block text-xs text-text-muted">{String(r.donor_email ?? "")}</span>
        </Td>
        <Td>{naira(r.amount)}</Td>
        <Td>
          <StatusPill status={String(r.status ?? "")} />
        </Td>
        <Td>{String(r.payment_type ?? "—")}</Td>
      </tr>
    );
  }
  if (view === "volunteers") {
    const interests = (r.interests as string[] | null) ?? [];
    return (
      <tr className="border-t border-border/40">
        <Td>{when(r.created_at)}</Td>
        <Td>
          <span className="text-text">{String(r.name ?? "")}</span>
          {r.email ? <span className="block text-xs text-text-muted">{String(r.email)}</span> : null}
        </Td>
        <Td>{String(r.phone ?? "")}</Td>
        <Td>{String(r.ward ?? "—")}</Td>
        <Td>{interests.length ? interests.join(", ") : "—"}</Td>
      </tr>
    );
  }
  if (view === "leads") {
    return (
      <tr className="border-t border-border/40">
        <Td>{when(r.created_at)}</Td>
        <Td>{String(r.email ?? "")}</Td>
        <Td>{String(r.phone ?? "—")}</Td>
        <Td>{String(r.source ?? "—")}</Td>
      </tr>
    );
  }
  if (view === "dp_supporters") {
    return (
      <tr className="border-t border-border/40">
        <Td>{when(r.created_at)}</Td>
        <Td className="text-text">{String(r.name ?? "")}</Td>
        <Td>{String(r.email ?? "")}</Td>
      </tr>
    );
  }
  return (
    <tr className="border-t border-border/40">
      <Td>{when(r.created_at)}</Td>
      <Td>
        <span className="text-text">{String(r.name ?? "")}</span>
        <span className="block text-xs text-text-muted">{String(r.contact ?? "")}</span>
      </Td>
      <Td className="max-w-md whitespace-pre-wrap">{String(r.message ?? "")}</Td>
    </tr>
  );
}

function CardMeta({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span className="text-xs uppercase tracking-wide text-text-muted/70">{label}</span>
      <span className="text-right text-text-muted">{value}</span>
    </div>
  );
}

function MobileCard({ view, r }: { view: AdminTableKey; r: Row }) {
  const base = "rounded-brand border border-border bg-surface/40 p-4";

  if (view === "voter_registrations") {
    const fullName = [r.surname, r.first_name, r.middle_name]
      .filter(Boolean)
      .join(" ");
    return (
      <div className={base}>
        <p className="font-medium text-text">{fullName}</p>
        <p className="text-xs text-text-muted">{String(r.mobile ?? "")}</p>
        <div className="mt-3 space-y-1.5 border-t border-border/40 pt-3">
          <CardMeta label="Date of birth" value={String(r.date_of_birth ?? "—")} />
          <CardMeta label="NIN" value={String(r.nin ?? "—")} />
          <CardMeta label="Ward" value={String(r.ward ?? "—")} />
          <CardMeta label="Polling unit" value={String(r.polling_unit ?? "—")} />
          <CardMeta label="LGA" value={String(r.lga_of_residence ?? "—")} />
          <CardMeta label="State of residence" value={String(r.state_of_residence ?? "—")} />
          <CardMeta label="Date" value={when(r.created_at)} />
        </div>
      </div>
    );
  }

  if (view === "donations") {
    return (
      <div className={base}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-medium text-text">{String(r.donor_name ?? "")}</p>
            <p className="truncate text-xs text-text-muted">{String(r.donor_email ?? "")}</p>
          </div>
          <p className="shrink-0 font-heading text-lg text-text">{naira(r.amount)}</p>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <StatusPill status={String(r.status ?? "")} />
          <span className="text-xs text-text-muted">{when(r.created_at)}</span>
        </div>
      </div>
    );
  }

  if (view === "volunteers") {
    const interests = (r.interests as string[] | null) ?? [];
    return (
      <div className={base}>
        <p className="font-medium text-text">{String(r.name ?? "")}</p>
        {r.email ? <p className="text-xs text-text-muted">{String(r.email)}</p> : null}
        <div className="mt-3 space-y-1.5 border-t border-border/40 pt-3">
          <CardMeta label="Phone" value={String(r.phone ?? "—")} />
          <CardMeta label="Ward" value={String(r.ward ?? "—")} />
          <CardMeta label="Interests" value={interests.length ? interests.join(", ") : "—"} />
          <CardMeta label="Date" value={when(r.created_at)} />
        </div>
      </div>
    );
  }

  if (view === "leads") {
    return (
      <div className={base}>
        <p className="truncate font-medium text-text">{String(r.email ?? "")}</p>
        <div className="mt-3 space-y-1.5 border-t border-border/40 pt-3">
          <CardMeta label="Phone" value={String(r.phone ?? "—")} />
          <CardMeta label="Source" value={String(r.source ?? "—")} />
          <CardMeta label="Date" value={when(r.created_at)} />
        </div>
      </div>
    );
  }

  if (view === "dp_supporters") {
    return (
      <div className={base}>
        <p className="font-medium text-text">{String(r.name ?? "")}</p>
        <p className="truncate text-xs text-text-muted">{String(r.email ?? "")}</p>
        <div className="mt-3 border-t border-border/40 pt-3">
          <CardMeta label="Date" value={when(r.created_at)} />
        </div>
      </div>
    );
  }

  return (
    <div className={base}>
      <p className="font-medium text-text">{String(r.name ?? "")}</p>
      <p className="text-xs text-text-muted">{String(r.contact ?? "")}</p>
      <p className="mt-3 whitespace-pre-wrap border-t border-border/40 pt-3 text-sm text-text-muted">
        {String(r.message ?? "")}
      </p>
      <p className="mt-3 text-xs text-text-muted/70">{when(r.created_at)}</p>
    </div>
  );
}

function GoalVelocity({
  raised,
  firstDonationAt,
}: {
  raised: number;
  firstDonationAt: string;
}) {
  const GOAL = 100_000_000;
  const remaining = Math.max(0, GOAL - raised);
  const daysSinceStart = Math.max(
    1,
    (Date.now() - new Date(firstDonationAt).getTime()) / (1000 * 60 * 60 * 24),
  );
  const dailyRate = raised / daysSinceStart;
  const daysToGoal = dailyRate > 0 ? Math.ceil(remaining / dailyRate) : null;

  const fmt = (n: number) =>
    n >= 1_000_000
      ? `₦${(n / 1_000_000).toFixed(1)}M`
      : n >= 1_000
        ? `₦${Math.round(n / 1_000)}K`
        : `₦${Math.round(n).toLocaleString("en-NG")}`;

  return (
    <div className="flex flex-wrap gap-4 text-right text-xs text-text-muted">
      <div>
        <p className="font-medium text-text">{fmt(Math.round(dailyRate))}</p>
        <p>avg / day</p>
      </div>
      <div>
        <p className="font-medium text-text">{fmt(remaining)}</p>
        <p>remaining</p>
      </div>
      {daysToGoal !== null && (
        <div>
          <p className="font-medium text-text">
            {daysToGoal > 365
              ? `${Math.round(daysToGoal / 30)}mo`
              : `${daysToGoal}d`}
          </p>
          <p>est. to goal</p>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-brand border border-border bg-surface/40 p-5">
      <p className="text-xs uppercase tracking-widest text-text-muted">{label}</p>
      <p className="mt-2 font-heading text-3xl text-text">{value}</p>
      <p className="mt-1 text-xs text-text-muted/70">{sub}</p>
    </div>
  );
}

function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 align-top ${className}`}>{children}</td>;
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

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    successful: "bg-green-500/15 text-green-300",
    pending: "bg-yellow-500/15 text-yellow-300",
    failed: "bg-primary/15 text-primary",
    abandoned: "bg-white/10 text-text-muted",
  };
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs ${map[status] ?? "bg-white/10 text-text-muted"}`}>
      {status}
    </span>
  );
}
