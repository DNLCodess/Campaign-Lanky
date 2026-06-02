"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useGSAP } from "@gsap/react";
import { gsap, prefersReducedMotion } from "@/lib/gsap";
import { site } from "@/lib/site";
import { CtaButton } from "@/components/ui/cta-button";
import { cn } from "@/lib/cn";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const overlay = useRef<HTMLDivElement>(null);

  // Lock body scroll + close on Escape while the menu is open.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Staggered entrance for the overlay menu.
  useGSAP(
    () => {
      if (!open || prefersReducedMotion()) return;
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.from(".m-link", { y: 40, opacity: 0, duration: 0.55, stagger: 0.07 }).from(
        ".m-foot",
        { y: 20, opacity: 0, duration: 0.5, stagger: 0.08 },
        "-=0.25",
      );
    },
    { dependencies: [open], scope: overlay },
  );

  return (
    <header className="sticky top-0 z-50">
      {/* Bar (blur lives here, NOT on <header>, so the fixed overlay below
          escapes to the viewport instead of being clipped to the bar box). */}
      <div className="border-b border-border/60 bg-bg/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
        <Link
          href="/"
          className="relative z-60 flex items-center"
          aria-label="Lanky — home"
          onClick={() => setOpen(false)}
        >
          <Image
            src="/brand/logo-white.png"
            alt="Lanky"
            width={132}
            height={36}
            priority
            className="h-7 w-auto"
          />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-7 lg:flex">
          {site.nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm text-text-muted transition-colors hover:text-text"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <CtaButton href={site.cta.volunteer.href} variant="outline" size="sm">
            {site.cta.volunteer.label}
          </CtaButton>
          <CtaButton href={site.cta.donate.href} variant="primary" size="sm">
            {site.cta.donate.label}
          </CtaButton>
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="relative z-60 flex h-10 w-10 items-center justify-center rounded-brand border border-border lg:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          <div className="space-y-1.5">
            <span
              className={cn(
                "block h-0.5 w-5 bg-text transition-transform duration-300",
                open && "translate-y-2 rotate-45",
              )}
            />
            <span
              className={cn(
                "block h-0.5 w-5 bg-text transition-opacity duration-300",
                open && "opacity-0",
              )}
            />
            <span
              className={cn(
                "block h-0.5 w-5 bg-text transition-transform duration-300",
                open && "-translate-y-2 -rotate-45",
              )}
            />
          </div>
        </button>
        </div>
      </div>

      {/* Premium full-screen mobile overlay */}
      <div
        ref={overlay}
        className={cn(
          "fixed inset-0 z-50 flex flex-col lg:hidden",
          "transition-[opacity,visibility] duration-300",
          open ? "visible opacity-100" : "invisible opacity-0",
        )}
        style={{ backgroundColor: "#071a26" }}
        aria-hidden={!open}
      >
        {/* Brand glow wash */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(70% 45% at 85% 8%, rgba(103,156,188,0.18), transparent 70%), radial-gradient(70% 45% at 0% 100%, rgba(194,23,32,0.16), transparent 70%)",
          }}
        />

        <div className="relative z-10 flex h-full flex-col px-6 pb-8 pt-24">
          {/* Links */}
          <nav className="flex flex-1 flex-col justify-center gap-1">
            {site.nav.map((item, i) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="m-link group flex items-baseline gap-4 py-2.5"
              >
                <span className="font-heading text-sm text-accent/60 tabular-nums">
                  0{i + 1}
                </span>
                <span className="font-heading text-4xl text-text transition-colors group-hover:text-accent sm:text-5xl">
                  {item.label}
                </span>
              </Link>
            ))}
          </nav>

          {/* Footer: CTAs + connect */}
          <div className="space-y-6">
            <div className="m-foot flex gap-3">
              <CtaButton
                href={site.cta.volunteer.href}
                variant="outline"
                size="lg"
                className="flex-1"
              >
                {site.cta.volunteer.label}
              </CtaButton>
              <CtaButton
                href={site.cta.donate.href}
                variant="primary"
                size="lg"
                className="flex-1"
              >
                {site.cta.donate.label}
              </CtaButton>
            </div>

            <div className="m-foot flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border/60 pt-5">
              {site.socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  className="text-sm text-text-muted transition-colors hover:text-accent"
                >
                  {s.label}
                </a>
              ))}
            </div>
            <p className="m-foot text-xs leading-relaxed text-text-muted/60">
              {site.party} · {site.constituency}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
