import { requirePortalRole } from "@/lib/portal/session";
import { PortalShell } from "@/app/portal/_components/portal-shell";
import type { SidebarNavItem } from "@/components/dashboard-sidebar";
import { portalPath } from "@/lib/portal/routes";

export const dynamic = "force-dynamic";

const NAV: SidebarNavItem[] = [
  { href: portalPath("/lga"), label: "Overview", icon: "overview" },
  { href: portalPath("/lga/coverage"), label: "Coverage", icon: "coverage" },
  { href: portalPath("/lga/accounts"), label: "Ward Agents", icon: "people" },
  { href: portalPath("/lga/messages"), label: "Messages", icon: "messages" },
  { href: portalPath("/lga/results"), label: "Results", icon: "results" },
];

export default async function LgaCoordinatorLayout({ children }: { children: React.ReactNode }) {
  const session = await requirePortalRole(["lga_coordinator"]);
  return (
    <PortalShell session={session} roleLabel={`LGA Coordinator — ${session.lga}`} nav={NAV}>
      {children}
    </PortalShell>
  );
}
