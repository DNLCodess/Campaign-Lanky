import { requirePortalRole } from "@/lib/portal/session";
import { PortalShell } from "@/app/portal/_components/portal-shell";

export const dynamic = "force-dynamic";

const NAV = [
  { href: "/ward", label: "Overview" },
  { href: "/ward/coverage", label: "Coverage" },
  { href: "/ward/accounts", label: "PU Agents" },
  { href: "/ward/messages", label: "Messages" },
  { href: "/ward/results", label: "Results" },
];

export default async function WardAgentLayout({ children }: { children: React.ReactNode }) {
  const session = await requirePortalRole(["ward_agent"]);
  return (
    <PortalShell session={session} roleLabel={`Ward Agent — ${session.lga}, Ward ${session.ward}`} nav={NAV}>
      {children}
    </PortalShell>
  );
}
