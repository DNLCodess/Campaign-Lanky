import { requirePortalRole } from "@/lib/portal/session";
import { PortalShell } from "@/app/portal/_components/portal-shell";
import type { SidebarNavItem } from "@/components/dashboard-sidebar";
import { portalPath } from "@/lib/portal/routes";

export const dynamic = "force-dynamic";

const NAV: SidebarNavItem[] = [
  { href: portalPath("/admin"), label: "Overview", icon: "overview" },
  { href: portalPath("/admin/coverage"), label: "Coverage", icon: "coverage" },
  { href: portalPath("/admin/accounts"), label: "LGA Coordinators", icon: "people" },
  { href: portalPath("/admin/elections"), label: "Election", icon: "election" },
  { href: portalPath("/admin/rewards"), label: "Rewards", icon: "rewards" },
  { href: portalPath("/admin/messages"), label: "Messages", icon: "messages" },
  { href: portalPath("/admin/audit"), label: "Audit Log", icon: "audit" },
];

export default async function ConstituencyAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requirePortalRole(["constituency_admin"]);
  return (
    <PortalShell session={session} roleLabel="Constituency Admin" nav={NAV}>
      {children}
    </PortalShell>
  );
}
