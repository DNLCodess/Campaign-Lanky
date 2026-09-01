import { logout } from "@/app/admin/actions";
import { DashboardSidebar, type SidebarNavItem } from "@/components/dashboard-sidebar";

const NAV: SidebarNavItem[] = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/submissions", label: "Submissions" },
  { href: "/admin/unit-leaders", label: "Unit Leaders" },
  { href: "/admin/team-leaders", label: "Team Leaders" },
  { href: "/admin/blog", label: "Blog" },
  { href: "/admin/team", label: "Team" },
];

export function AdminSidebar({ email }: { email?: string }) {
  return (
    <DashboardSidebar brand="Campaign Admin" nav={NAV} identity={email} logoutAction={logout} />
  );
}
