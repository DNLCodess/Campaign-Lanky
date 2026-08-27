import { requirePortalRole } from "@/lib/portal/session";
import { PortalShell } from "@/app/portal/_components/portal-shell";

export const dynamic = "force-dynamic";

const NAV = [
  { href: "/lga", label: "Overview" },
  { href: "/lga/coverage", label: "Coverage" },
  { href: "/lga/accounts", label: "Ward Agents" },
  { href: "/lga/messages", label: "Messages" },
  { href: "/lga/results", label: "Results" },
];

export default async function LgaCoordinatorLayout({ children }: { children: React.ReactNode }) {
  const session = await requirePortalRole(["lga_coordinator"]);
  return (
    <PortalShell session={session} roleLabel={`LGA Coordinator — ${session.lga}`} nav={NAV}>
      {children}
    </PortalShell>
  );
}
