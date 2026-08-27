import { requirePortalRole } from "@/lib/portal/session";
import { PortalShell } from "@/app/portal/_components/portal-shell";

export const dynamic = "force-dynamic";

const NAV = [{ href: "/pu", label: "Submit Result" }];

export default async function PuAgentLayout({ children }: { children: React.ReactNode }) {
  const session = await requirePortalRole(["pu_agent"]);
  return (
    <PortalShell session={session} roleLabel={`PU Agent — ${session.polling_unit}`} nav={NAV}>
      {children}
    </PortalShell>
  );
}
