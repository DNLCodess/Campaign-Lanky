"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

export type NavIconName =
  | "overview"
  | "coverage"
  | "people"
  | "network"
  | "election"
  | "rewards"
  | "messages"
  | "audit"
  | "results"
  | "submit"
  | "submissions"
  | "blog";

export type SidebarNavItem = { href: string; label: string; icon?: NavIconName };

/**
 * Shared responsive nav shell for the site's dashboards (site admin at
 * /admin, election results portal at /portal/*). Desktop: fixed left
 * sidebar. Mobile: top bar with a hamburger-triggered slide-out drawer.
 * Brand-agnostic — callers supply the nav items, identity line, and logout
 * action; `AdminSidebar` and the portal's sidebar are thin wrappers around
 * this that just supply that config.
 *
 * `logo` swaps the text wordmark for an image; `tone` paints the sidebar
 * surfaces with the brand aurora gradient (matches the portal login page).
 *
 * The first nav item is treated as the section root (exact-match only,
 * since its href is a path-prefix of every other item — e.g. "/admin" is a
 * prefix of "/admin/accounts" — so without this it would show as active on
 * every sub-page too).
 */
export function DashboardSidebar({
  brand,
  nav,
  identity,
  logoutAction,
  logo,
  tone = false,
}: {
  brand: string;
  nav: SidebarNavItem[];
  identity?: string;
  logoutAction: () => Promise<void>;
  logo?: { src: string; alt: string };
  tone?: boolean;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const homeHref = nav[0]?.href ?? "#";

  function isActive(href: string, isRoot: boolean): boolean {
    if (isRoot) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  const brandMark = logo ? (
    <Image src={logo.src} alt={logo.alt} width={132} height={36} className="h-7 w-auto" priority />
  ) : (
    <span className="font-heading text-xl text-text">{brand}</span>
  );

  const navList = (
    <nav className="-mr-2 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto pr-2">
      {nav.map((item, i) => {
        const active = isActive(item.href, i === 0);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-3 rounded-brand px-3 py-2.5 text-sm transition-colors ${
              active
                ? "bg-primary/15 font-medium text-text"
                : "text-text-muted hover:bg-surface/60 hover:text-text"
            }`}
          >
            {item.icon && (
              <NavIcon
                name={item.icon}
                className={active ? "text-accent" : "text-text-muted/70"}
              />
            )}
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  const footer = (
    <div className="shrink-0 border-t border-border/60 pt-4">
      {identity && (
        <p className="mb-3 truncate px-3 text-xs text-text-muted" title={identity}>
          {identity}
        </p>
      )}
      <form action={logoutAction}>
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-brand border border-border bg-surface/40 px-3 py-2.5 text-sm font-medium text-text transition-colors hover:border-primary hover:bg-primary/15"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
            className="shrink-0"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <path d="m16 17 5-5-5-5" />
            <path d="M21 12H9" />
          </svg>
          Sign out
        </button>
      </form>
    </div>
  );

  const surface = tone ? "tone-aurora" : "bg-surface/20";

  return (
    <>
      {/* Mobile top bar */}
      <div
        className={`sticky top-0 z-30 flex items-center justify-between border-b border-border/60 px-4 py-3 md:hidden ${
          tone ? "tone-aurora" : "bg-bg"
        }`}
      >
        <Link href={homeHref} className="flex items-center" aria-label={brand}>
          {brandMark}
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="rounded-brand border border-border p-2 text-text-muted transition-colors hover:border-accent hover:text-text"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      </div>

      {/* Desktop sidebar — pinned full-height; only the nav list scrolls */}
      <aside
        className={`sticky top-0 hidden h-screen w-60 shrink-0 flex-col overflow-hidden border-r border-border/60 p-4 md:flex ${surface}`}
      >
        {tone && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent to-transparent"
          />
        )}
        <Link href={homeHref} className="mb-6 flex shrink-0 items-center px-3" aria-label={brand}>
          {brandMark}
        </Link>
        {navList}
        {footer}
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} aria-hidden />
          <aside
            className={`absolute left-0 top-0 flex h-full w-64 flex-col overflow-hidden border-r border-border/60 p-4 ${
              tone ? "tone-aurora" : "bg-bg"
            }`}
          >
            <div className="mb-6 flex shrink-0 items-center justify-between px-1">
              <Link href={homeHref} onClick={() => setOpen(false)} className="flex items-center" aria-label={brand}>
                {brandMark}
              </Link>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="rounded-brand border border-border p-2 text-text-muted transition-colors hover:border-accent hover:text-text"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            {navList}
            {footer}
          </aside>
        </div>
      )}
    </>
  );
}

const ICON_PATHS: Record<NavIconName, React.ReactNode> = {
  overview: (
    <>
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </>
  ),
  coverage: (
    <>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </>
  ),
  people: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  network: (
    <>
      <rect x="16" y="16" width="6" height="6" rx="1" />
      <rect x="2" y="16" width="6" height="6" rx="1" />
      <rect x="9" y="2" width="6" height="6" rx="1" />
      <path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3" />
      <path d="M12 12V8" />
    </>
  ),
  election: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  rewards: (
    <>
      <rect x="3" y="8" width="18" height="4" rx="1" />
      <path d="M12 8v13" />
      <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" />
      <path d="M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8" />
      <path d="M16.5 8a2.5 2.5 0 0 0 0-5C13 3 12 8 12 8" />
    </>
  ),
  messages: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
  audit: (
    <>
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M12 11h4" />
      <path d="M12 16h4" />
      <path d="M8 11h.01" />
      <path d="M8 16h.01" />
    </>
  ),
  results: (
    <>
      <path d="M3 3v18h18" />
      <path d="M18 17V9" />
      <path d="M13 17V5" />
      <path d="M8 17v-3" />
    </>
  ),
  submit: (
    <>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z" />
      <path d="M14 2v5h5" />
      <path d="M12 18v-6" />
      <path d="m9 15 3-3 3 3" />
    </>
  ),
  submissions: (
    <>
      <path d="M22 12h-6l-2 3h-4l-2-3H2" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z" />
    </>
  ),
  blog: (
    <>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z" />
      <path d="M14 2v5h5" />
      <path d="M16 13H8" />
      <path d="M16 17H8" />
      <path d="M10 9H8" />
    </>
  ),
};

function NavIcon({ name, className = "" }: { name: NavIconName; className?: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={`shrink-0 transition-colors ${className}`}
    >
      {ICON_PATHS[name]}
    </svg>
  );
}
