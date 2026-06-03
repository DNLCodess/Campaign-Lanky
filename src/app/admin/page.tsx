import { requireAdmin } from "@/lib/admin-auth";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { logout } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

type Lead = { id: string; email: string; phone: string | null; source: string | null; created_at: string };
type Volunteer = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  ward: string | null;
  interests: string[] | null;
  created_at: string;
};
type Message = { id: string; name: string; contact: string; message: string; created_at: string };
type Donation = {
  id: string;
  amount: number;
  currency: string;
  donor_name: string;
  donor_email: string;
  status: string;
  payment_type: string | null;
  created_at: string;
};

type DashboardData = {
  configured: boolean;
  counts: { leads: number; volunteers: number; messages: number; donations: number };
  raised: number;
  successfulCount: number;
  leads: Lead[];
  volunteers: Volunteer[];
  messages: Message[];
  donations: Donation[];
};

const naira = (n: number) => `₦${Number(n).toLocaleString("en-NG")}`;
const when = (iso: string) =>
  new Date(iso).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" });

async function getData(): Promise<DashboardData> {
  const empty: DashboardData = {
    configured: false,
    counts: { leads: 0, volunteers: 0, messages: 0, donations: 0 },
    raised: 0,
    successfulCount: 0,
    leads: [],
    volunteers: [],
    messages: [],
    donations: [],
  };

  try {
    const supabase = createAdminSupabase();
    const recent = <T,>(table: string) =>
      supabase
        .from(table)
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .limit(50) as unknown as Promise<{ data: T[] | null; count: number | null }>;

    const [leads, volunteers, messages, donations, successful] = await Promise.all([
      recent<Lead>("leads"),
      recent<Volunteer>("volunteers"),
      recent<Message>("messages"),
      recent<Donation>("donations"),
      supabase.from("donations").select("amount").eq("status", "successful").limit(5000),
    ]);

    const successRows = (successful.data ?? []) as { amount: number }[];
    return {
      configured: true,
      counts: {
        leads: leads.count ?? 0,
        volunteers: volunteers.count ?? 0,
        messages: messages.count ?? 0,
        donations: donations.count ?? 0,
      },
      raised: successRows.reduce((s, r) => s + Number(r.amount), 0),
      successfulCount: successRows.length,
      leads: leads.data ?? [],
      volunteers: volunteers.data ?? [],
      messages: messages.data ?? [],
      donations: donations.data ?? [],
    };
  } catch (err) {
    console.error("[admin] data load failed", err);
    return empty;
  }
}

export default async function AdminDashboard() {
  const user = await requireAdmin();
  const d = await getData();

  return (
    <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
      {/* Top bar */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div>
          <h1 className="font-heading text-2xl text-text">Campaign Admin</h1>
          <p className="text-sm text-text-muted">{user.email}</p>
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="rounded-brand border border-border px-4 py-2 text-sm text-text-muted transition-colors hover:border-accent hover:text-text"
          >
            Sign out
          </button>
        </form>
      </header>

      {!d.configured && (
        <p className="mt-6 rounded-brand border border-primary/40 bg-primary/10 p-4 text-sm text-text">
          Data source not configured. Set <code>SUPABASE_SERVICE_ROLE_KEY</code> in
          the environment to load submissions.
        </p>
      )}

      {/* Stat cards */}
      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Total raised" value={naira(d.raised)} sub={`${d.successfulCount} donations`} />
        <Stat label="Supporters" value={String(d.counts.leads)} sub="email / phone signups" />
        <Stat label="Volunteers" value={String(d.counts.volunteers)} sub="sign-ups" />
        <Stat label="Messages" value={String(d.counts.messages)} sub="contact form" />
      </div>

      {/* Donations */}
      <Section title="Donations" count={d.counts.donations}>
        <Table head={["Date", "Donor", "Amount", "Status", "Method"]}>
          {d.donations.map((r) => (
            <tr key={r.id} className="border-t border-border/40">
              <Td>{when(r.created_at)}</Td>
              <Td>
                <span className="text-text">{r.donor_name}</span>
                <span className="block text-xs text-text-muted">{r.donor_email}</span>
              </Td>
              <Td>{naira(r.amount)}</Td>
              <Td>
                <StatusPill status={r.status} />
              </Td>
              <Td>{r.payment_type ?? "—"}</Td>
            </tr>
          ))}
        </Table>
      </Section>

      {/* Volunteers */}
      <Section title="Volunteers" count={d.counts.volunteers}>
        <Table head={["Date", "Name", "Phone", "Ward", "Interests"]}>
          {d.volunteers.map((r) => (
            <tr key={r.id} className="border-t border-border/40">
              <Td>{when(r.created_at)}</Td>
              <Td>
                <span className="text-text">{r.name}</span>
                {r.email && <span className="block text-xs text-text-muted">{r.email}</span>}
              </Td>
              <Td>{r.phone}</Td>
              <Td>{r.ward ?? "—"}</Td>
              <Td>{r.interests?.length ? r.interests.join(", ") : "—"}</Td>
            </tr>
          ))}
        </Table>
      </Section>

      {/* Supporters / leads */}
      <Section title="Supporters" count={d.counts.leads}>
        <Table head={["Date", "Email", "Phone", "Source"]}>
          {d.leads.map((r) => (
            <tr key={r.id} className="border-t border-border/40">
              <Td>{when(r.created_at)}</Td>
              <Td>{r.email}</Td>
              <Td>{r.phone ?? "—"}</Td>
              <Td>{r.source ?? "—"}</Td>
            </tr>
          ))}
        </Table>
      </Section>

      {/* Messages */}
      <Section title="Messages" count={d.counts.messages}>
        <Table head={["Date", "From", "Message"]}>
          {d.messages.map((r) => (
            <tr key={r.id} className="border-t border-border/40">
              <Td>{when(r.created_at)}</Td>
              <Td>
                <span className="text-text">{r.name}</span>
                <span className="block text-xs text-text-muted">{r.contact}</span>
              </Td>
              <Td className="max-w-md whitespace-pre-wrap">{r.message}</Td>
            </tr>
          ))}
        </Table>
      </Section>
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

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10">
      <h2 className="font-heading text-xl text-text">
        {title} <span className="text-base text-text-muted">({count})</span>
      </h2>
      <div className="mt-3 overflow-x-auto rounded-brand border border-border">
        {children}
      </div>
    </section>
  );
}

function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <table className="w-full min-w-[640px] text-left text-sm">
      <thead>
        <tr className="bg-surface/60 text-xs uppercase tracking-wide text-text-muted">
          {head.map((h) => (
            <th key={h} className="px-4 py-3 font-medium">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="text-text-muted">{children}</tbody>
    </table>
  );
}

function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 align-top ${className}`}>{children}</td>;
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
