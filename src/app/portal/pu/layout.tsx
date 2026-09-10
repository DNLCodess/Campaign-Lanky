import { requirePortalRole } from "@/lib/portal/session";
import { PortalShell } from "@/app/portal/_components/portal-shell";
import type { SidebarNavItem } from "@/components/dashboard-sidebar";
import { portalPath } from "@/lib/portal/routes";

export const dynamic = "force-dynamic";

const NAV: SidebarNavItem[] = [{ href: portalPath("/pu"), label: "Submit Result", icon: "submit" }];

export default async function PuAgentLayout({ children }: { children: React.ReactNode }) {
  const session = await requirePortalRole(["pu_agent"]);
  return (
    <PortalShell session={session} roleLabel={`PU Agent — ${session.polling_unit}`} nav={NAV}>
      {children}
    </PortalShell>
  );
}
