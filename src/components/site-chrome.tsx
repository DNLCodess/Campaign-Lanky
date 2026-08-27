"use client";

import { usePathname } from "next/navigation";

/**
 * Renders the public header/footer around page content — except under /admin
 * or /portal (election results portal, rewritten here from
 * portal.votelanky.com by middleware), which have their own chrome.
 * Header/footer are passed in as props so they stay server-rendered.
 */
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
  if (pathname?.startsWith("/admin") || pathname?.startsWith("/portal")) {
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
