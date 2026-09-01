"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export type SidebarNavItem = { href: string; label: string };

/**
 * Shared responsive nav shell for the site's dashboards (site admin at
 * /admin, election results portal at /portal/*). Desktop: fixed left
 * sidebar. Mobile: top bar with a hamburger-triggered slide-out drawer.
 * Brand-agnostic — callers supply the nav items, identity line, and logout
 * action; `AdminSidebar` and the portal's sidebar are thin wrappers around
 * this that just supply that config.
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
}: {
  brand: string;
  nav: SidebarNavItem[];
  identity?: string;
  logoutAction: () => Promise<void>;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const homeHref = nav[0]?.href ?? "#";

  function isActive(href: string, isRoot: boolean): boolean {
    if (isRoot) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  const navList = (
    <nav className="flex flex-col gap-1">
      {nav.map((item, i) => {
        const active = isActive(item.href, i === 0);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className={`rounded-brand px-3 py-2.5 text-sm transition-colors ${
              active
                ? "bg-primary/15 font-medium text-text"
                : "text-text-muted hover:bg-surface/60 hover:text-text"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  const footer = (
    <div className="mt-auto border-t border-border/60 pt-4">
      {identity && (
        <p className="mb-3 truncate px-3 text-xs text-text-muted" title={identity}>
          {identity}
        </p>
      )}
      <form action={logoutAction}>
        <button
          type="submit"
          className="w-full rounded-brand border border-border px-3 py-2 text-sm text-text-muted transition-colors hover:border-accent hover:text-text"
        >
          Sign out
        </button>
      </form>
    </div>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-3 md:hidden">
        <span className="font-heading text-lg text-text">{brand}</span>
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

      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border/60 bg-surface/20 p-4 md:flex">
        <Link href={homeHref} className="mb-6 block px-3 font-heading text-xl text-text">
          {brand}
        </Link>
        {navList}
        {footer}
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} aria-hidden />
          <aside className="absolute left-0 top-0 flex h-full w-64 flex-col border-r border-border/60 bg-bg p-4">
            <div className="mb-6 flex items-center justify-between px-1">
              <span className="font-heading text-xl text-text">{brand}</span>
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
