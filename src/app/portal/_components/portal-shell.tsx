import { logoutPortal } from "@/app/portal/actions/auth";
import { DashboardSidebar, type SidebarNavItem } from "@/components/dashboard-sidebar";
import type { PortalSession } from "@/lib/portal/session";

export function PortalShell({
  session,
  roleLabel,
  nav,
  children,
}: {
  session: PortalSession;
  roleLabel: string;
  nav: SidebarNavItem[];
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <DashboardSidebar
        brand="Results Portal"
        nav={nav}
        identity={`${session.full_name} — ${roleLabel}`}
        logoutAction={logoutPortal}
      />
      <main className="min-w-0 flex-1 px-5 py-8">{children}</main>
    </div>
  );
}
