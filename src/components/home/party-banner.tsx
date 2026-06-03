import Image from "next/image";
import { Reveal } from "@/components/motion/reveal";
import { CtaButton } from "@/components/ui/cta-button";
import { site } from "@/lib/site";

/**
 * Bold rallying band that puts the Labour Party and Oyo State front and centre.
 */
export function PartyBanner() {
  return (
    <section className="tone-red relative overflow-hidden border-y border-border/60 py-24">
      {/* Oversized ghost wordmark */}
      <span
        aria-hidden
        className="pointer-events-none absolute -right-6 top-1/2 -translate-y-1/2 select-none font-heading text-[22vw] font-bold leading-none text-white/[0.04] lg:text-[16vw]"
      >
        OYO
      </span>

      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-[auto_1fr] lg:gap-14">
          {/* Party lockup */}
          <Reveal className="flex flex-col items-start gap-4">
            <Image
              src={site.partyLogo}
              alt="Labour Party"
              width={120}
              height={120}
              className="h-24 w-24"
            />
            <span className="rounded-full border border-white/20 bg-white/5 px-4 py-1.5 text-sm font-medium tracking-wide text-text">
              {site.party} · {site.state}
            </span>
          </Reveal>

          {/* Statement */}
          <Reveal delay={0.1}>
            <h2 className="font-heading text-4xl leading-[1.05] text-text sm:text-5xl lg:text-6xl">
              Proudly Labour.
              <br />
              <span className="text-accent">For a new Oyo State.</span>
            </h2>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-text-muted">
              A vote for Lanky is a vote for the <strong className="text-text">Labour
              Party</strong> — a movement restoring hope across{" "}
              <strong className="text-text">Oyo State</strong>. Together we choose
              competence over politics-as-usual, and people over promises.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <CtaButton href={site.cta.volunteer.href} variant="primary" size="lg">
                Join the Movement
              </CtaButton>
              <span className="text-sm text-text-muted">
                Vote Labour Party · Ibadan SW / NW
              </span>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
