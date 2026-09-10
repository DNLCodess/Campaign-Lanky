import { requirePortalRole } from "@/lib/portal/session";
import { PortalShell } from "@/app/portal/_components/portal-shell";
import type { SidebarNavItem } from "@/components/dashboard-sidebar";
import { portalPath } from "@/lib/portal/routes";

export const dynamic = "force-dynamic";

const NAV: SidebarNavItem[] = [
  { href: portalPath("/ward"), label: "Overview", icon: "overview" },
  { href: portalPath("/ward/coverage"), label: "Coverage", icon: "coverage" },
  { href: portalPath("/ward/accounts"), label: "PU Agents", icon: "people" },
  { href: portalPath("/ward/messages"), label: "Messages", icon: "messages" },
  { href: portalPath("/ward/results"), label: "Results", icon: "results" },
];

export default async function WardAgentLayout({ children }: { children: React.ReactNode }) {
  const session = await requirePortalRole(["ward_agent"]);
  return (
    <PortalShell session={session} roleLabel={`Ward Agent — ${session.lga}, Ward ${session.ward}`} nav={NAV}>
      {children}
    </PortalShell>
  );
}
