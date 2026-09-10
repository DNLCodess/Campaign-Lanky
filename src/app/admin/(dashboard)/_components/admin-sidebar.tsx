import { logout } from "@/app/admin/actions";
import { DashboardSidebar, type SidebarNavItem } from "@/components/dashboard-sidebar";

const NAV: SidebarNavItem[] = [
  { href: "/admin", label: "Overview", icon: "overview" },
  { href: "/admin/submissions", label: "Submissions", icon: "submissions" },
  { href: "/admin/unit-leaders", label: "Unit Leaders", icon: "people" },
  { href: "/admin/team-leaders", label: "Team Leaders", icon: "network" },
  { href: "/admin/blog", label: "Blog", icon: "blog" },
  { href: "/admin/team", label: "Team", icon: "people" },
];

export function AdminSidebar({ email }: { email?: string }) {
  return (
    <DashboardSidebar brand="Campaign Admin" nav={NAV} identity={email} logoutAction={logout} />
  );
}
