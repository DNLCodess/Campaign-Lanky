import Link from "next/link";
import { logoutPortal } from "@/app/portal/actions/auth";
import type { PortalSession } from "@/lib/portal/session";

export function PortalShell({
  session,
  roleLabel,
  nav,
  children,
}: {
  session: PortalSession;
  roleLabel: string;
  nav: { href: string; label: string }[];
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border bg-surface/40 px-5 py-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-accent">{roleLabel}</p>
          <p className="font-heading text-lg text-text">{session.full_name}</p>
        </div>
        <nav className="flex flex-wrap gap-1">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-brand px-3 py-2 text-sm text-text-muted transition-colors hover:bg-surface-2 hover:text-text"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <form action={logoutPortal}>
          <button
            type="submit"
            className="rounded-brand border border-border px-4 py-2 text-sm text-text-muted transition-colors hover:border-primary hover:text-primary"
          >
            Sign out
          </button>
        </form>
      </header>
      <main className="flex-1 px-5 py-8">{children}</main>
    </div>
  );
}
