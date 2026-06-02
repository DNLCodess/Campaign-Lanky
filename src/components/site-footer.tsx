import Link from "next/link";
import Image from "next/image";
import { site } from "@/lib/site";
import { CtaButton } from "@/components/ui/cta-button";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-surface/40">
      <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          {/* Brand */}
          <div>
            <Image
              src="/brand/logo-white.png"
              alt="Lanky"
              width={140}
              height={38}
              className="h-8 w-auto"
            />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-text-muted">
              {site.slogan}
            </p>
            <p className="mt-4 text-xs text-text-muted/70">
              {site.candidate} · {site.party}
              <br />
              {site.constituency}
            </p>
          </div>

          {/* Explore */}
          <div>
            <h4 className="text-sm font-semibold tracking-wide text-text">Explore</h4>
            <ul className="mt-4 space-y-2.5">
              {site.nav.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-text-muted transition-colors hover:text-accent"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h4 className="text-sm font-semibold tracking-wide text-text">Connect</h4>
            <ul className="mt-4 space-y-2.5">
              {site.socials.map((s) => (
                <li key={s.label}>
                  <a
                    href={s.href}
                    className="text-sm text-text-muted transition-colors hover:text-accent"
                  >
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
            <div className="mt-6">
              <CtaButton href={site.cta.donate.href} variant="primary" size="sm">
                {site.cta.donate.label}
              </CtaButton>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-border/60 pt-6 text-xs text-text-muted/70 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {site.shortName} Campaign. All rights reserved.
          </p>
          <p>Paid for by the {site.candidate} Campaign Organisation.</p>
        </div>
      </div>
    </footer>
  );
}
