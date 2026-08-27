import { requirePortalRole } from "@/lib/portal/session";
import { listAllAccounts } from "@/app/portal/actions/accounts";
import { getAllConstituencyGeo } from "@/lib/portal/geo";
import { AccountRowActions } from "@/app/portal/_components/account-row-actions";
import { AdminAccountForm } from "@/app/portal/admin/accounts/admin-account-form";
import type { PortalRole } from "@/lib/portal/constants";
import { LGAS } from "@/lib/portal/constants";

export const dynamic = "force-dynamic";

const ROLE_LABELS: Record<string, string> = {
  lga_coordinator: "LGA Coordinator",
  ward_agent: "Ward Agent",
  pu_agent: "PU Agent",
};

export default async function AdminAccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; lga?: string }>;
}) {
  await requirePortalRole(["constituency_admin"]);
  const { role, lga } = await searchParams;

  const [accounts, geo] = await Promise.all([
    listAllAccounts({ role: role as PortalRole | undefined, lga }),
    getAllConstituencyGeo(),
  ]);

  const filterHref = (nextRole?: string, nextLga?: string) => {
    const params = new URLSearchParams();
    if (nextRole) params.set("role", nextRole);
    if (nextLga) params.set("lga", nextLga);
    const qs = params.toString();
    return `/admin/accounts${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="font-heading text-2xl text-text">Accounts</h1>
        <p className="mt-1 text-sm text-text-muted">
          Create or manage any account in the hierarchy — LGA coordinators, ward agents, or PU
          agents — for any LGA, ward, or polling unit.
        </p>
      </div>

      <div className="rounded-brand border border-border bg-surface/40 p-5">
        <AdminAccountForm geo={geo} />
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-text-muted">Role:</span>
        <FilterLink href={filterHref(undefined, lga)} active={!role}>
          All
        </FilterLink>
        {Object.entries(ROLE_LABELS).map(([value, label]) => (
          <FilterLink key={value} href={filterHref(value, lga)} active={role === value}>
            {label}
          </FilterLink>
        ))}
        <span className="ml-4 text-text-muted">LGA:</span>
        <FilterLink href={filterHref(role, undefined)} active={!lga}>
          All
        </FilterLink>
        {LGAS.map((l) => (
          <FilterLink key={l} href={filterHref(role, l)} active={lga === l}>
            {l}
          </FilterLink>
        ))}
      </div>

      <div className="overflow-x-auto rounded-brand border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-left text-text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Location</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {accounts.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-text-muted">
                  No accounts match this filter.
                </td>
              </tr>
            )}
            {accounts.map((a) => (
              <tr key={a.id} className="border-t border-border align-top">
                <td className="px-4 py-3 text-text">{a.full_name}</td>
                <td className="px-4 py-3 text-text-muted">{ROLE_LABELS[a.role] ?? a.role}</td>
                <td className="px-4 py-3 text-text-muted">
                  {a.polling_unit ?? (a.ward ? `${a.lga} · Ward ${a.ward}` : a.lga)}
                </td>
                <td className="px-4 py-3 text-text-muted">{a.email}</td>
                <td className="px-4 py-3">
                  <span className={a.is_active ? "text-accent" : "text-text-muted"}>
                    {a.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <AccountRowActions accountId={a.id} isActive={a.is_active} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
