import { requirePortalRole } from "@/lib/portal/session";
import { PortalShell } from "@/app/portal/_components/portal-shell";

export const dynamic = "force-dynamic";

const NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/coverage", label: "Coverage" },
  { href: "/admin/accounts", label: "LGA Coordinators" },
  { href: "/admin/elections", label: "Election" },
  { href: "/admin/rewards", label: "Rewards" },
  { href: "/admin/messages", label: "Messages" },
  { href: "/admin/audit", label: "Audit Log" },
];

export default async function ConstituencyAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requirePortalRole(["constituency_admin"]);
  return (
    <PortalShell session={session} roleLabel="Constituency Admin" nav={NAV}>
      {children}
    </PortalShell>
  );
}
