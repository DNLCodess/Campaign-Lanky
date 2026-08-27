import { redirect } from "next/navigation";
import { getPortalSession } from "@/lib/portal/session";
import { ROLE_CONFIG } from "@/lib/portal/constants";

export const dynamic = "force-dynamic";

export default async function PortalIndexPage() {
  const session = await getPortalSession();
  if (!session) redirect("/portal/login");
  if (session.must_change_password) redirect("/portal/change-password");
  redirect(ROLE_CONFIG[session.role].homePath);
}
