"use client";

import { usePathname } from "next/navigation";

/**
 * Renders the public header/footer around page content — except on the
 * dashboards, which have their own chrome. The election results portal is
 * served from portal.votelanky.com and rewritten to /portal/* by the proxy,
 * but the rewrite is transparent to the client: usePathname() still reports
 * the visible URL (/admin, /lga, /ward, /pu), so all four portal roots are
 * matched here explicitly. In local dev (NEXT_PUBLIC_PORTAL_BASE=/portal) the
 * portal is served under /portal/* directly, covered by that prefix.
 * Header/footer are passed in as props so they stay server-rendered.
 */
const DASHBOARD_PREFIXES = ["/admin", "/portal", "/lga", "/ward", "/pu"];

export function SiteChrome({
  header,
  footer,
  children,
}: {
  header: React.ReactNode;
  footer: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const onDashboard = DASHBOARD_PREFIXES.some(
    (p) => pathname === p || pathname?.startsWith(`${p}/`),
  );
  if (onDashboard) {
    return <main className="flex-1">{children}</main>;
  }
  return (
    <>
      {header}
      <main className="flex-1">{children}</main>
      {footer}
    </>
  );
}
