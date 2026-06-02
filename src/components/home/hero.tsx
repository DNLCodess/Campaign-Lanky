"use client";

import { useRef } from "react";
import Image from "next/image";
import { useGSAP } from "@gsap/react";
import { gsap, prefersReducedMotion } from "@/lib/gsap";
import { site } from "@/lib/site";
import { CtaButton } from "@/components/ui/cta-button";

export function Hero() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;

      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.from(".hero-eyebrow", { opacity: 0, y: 16, duration: 0.6 })
        .from(
          ".hero-word",
          { opacity: 0, yPercent: 120, duration: 0.9, stagger: 0.08 },
          "-=0.2",
        )
        .from(".hero-sub", { opacity: 0, y: 20, duration: 0.7 }, "-=0.5")
        .from(".hero-cta", { opacity: 0, y: 20, duration: 0.6, stagger: 0.1 }, "-=0.4")
        .from(
          ".hero-portrait",
          { opacity: 0, scale: 1.06, duration: 1.2, ease: "power2.out" },
          0.2,
        );
    },
    { scope: root },
  );

  // Headline split into words for the staggered reveal.
  const headline = "Securing Our Future, Together.";
  const words = headline.split(" ");

  return (
    <section
      ref={root}
      className="relative overflow-hidden"
      aria-label="Introduction"
    >
      {/* Ambient brand glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(60% 50% at 75% 30%, rgba(103,156,188,0.18), transparent 70%), radial-gradient(50% 60% at 15% 90%, rgba(194,23,32,0.12), transparent 70%)",
        }}
      />

      <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:py-24">
        {/* Copy */}
        <div>
          <p className="hero-eyebrow inline-flex items-center gap-2 rounded-full border border-border bg-surface/50 px-4 py-1.5 text-xs font-medium tracking-wide text-accent">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            {site.party} · {site.constituency}
          </p>

          <h1 className="mt-6 font-heading text-5xl leading-[1.02] tracking-tight text-text sm:text-6xl lg:text-7xl">
            <span className="block overflow-hidden">
              <span className="hero-word inline-block text-accent">Innovation</span>{" "}
              <span className="hero-word inline-block">for Ibadan.</span>
            </span>
            <span className="mt-2 block text-text-muted">
              {words.map((w, i) => (
                <span key={i} className="inline-block overflow-hidden align-bottom">
                  <span className="hero-word inline-block">{w}&nbsp;</span>
                </span>
              ))}
            </span>
          </h1>

          <p className="hero-sub mt-6 max-w-xl text-lg leading-relaxed text-text-muted">
            {site.candidate} — <em className="text-text">{site.tagline}</em>. Building a
            digitally empowered, educated, and prosperous constituency where every
            citizen has a voice and every youth has an opportunity.
          </p>

          <div className="mt-9 flex flex-wrap gap-4">
            <span className="hero-cta">
              <CtaButton href={site.cta.donate.href} variant="primary" size="lg">
                {site.cta.donate.label}
              </CtaButton>
            </span>
            <span className="hero-cta">
              <CtaButton href={site.cta.volunteer.href} variant="outline" size="lg">
                {site.cta.volunteer.label}
              </CtaButton>
            </span>
          </div>
        </div>

        {/* Portrait — placeholder framing until transparent cut-out arrives */}
        <div className="hero-portrait relative mx-auto w-full max-w-md">
          <div className="relative aspect-[4/5] overflow-hidden rounded-brand border border-border bg-surface">
            <Image
              src="/brand/candidate-1.jpeg"
              alt={`${site.candidate}, ${site.tagline}`}
              fill
              priority
              sizes="(max-width: 1024px) 90vw, 40vw"
              className="object-cover object-top"
            />
            {/* Navy scrim blends the studio backdrop into the dark theme
                (will be replaced by a transparent cut-out per the brief). */}
            <div
              aria-hidden
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(to top, rgba(7,26,38,0.85) 0%, rgba(7,26,38,0.15) 45%, rgba(7,26,38,0) 70%)",
              }}
            />
            <div className="absolute bottom-5 left-5 right-5">
              <p className="font-heading text-2xl text-white">{site.shortName}</p>
              <p className="text-sm text-white/70">{site.tagline}</p>
            </div>
          </div>

          {/* Window-pane motif accent (brand mark echo) */}
          <div
            aria-hidden
            className="absolute -right-4 -top-4 grid h-16 w-16 grid-cols-2 grid-rows-2 gap-1.5 opacity-80"
          >
            <span className="rounded-[3px] bg-transparent" />
            <span className="rounded-[3px] bg-navy" />
            <span className="rounded-[3px] bg-steel" />
            <span className="rounded-[3px] bg-primary" />
          </div>
        </div>
      </div>
    </section>
  );
}
