"use client";

import { usePathname } from "next/navigation";

/**
 * Renders the public header/footer around page content — except under /admin,
 * which has its own chrome. Header/footer are passed in as props so they stay
 * server-rendered.
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
  if (pathname?.startsWith("/admin")) {
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
