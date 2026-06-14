import { Suspense } from "react";
import { Reveal } from "@/components/motion/reveal";
import { CtaButton } from "@/components/ui/cta-button";
import { DonationProgress } from "@/components/donation-progress";

function ProgressSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-7 w-1/2 rounded bg-border/30" />
      <div className="h-2 w-full rounded-full bg-border/30" />
      <div className="h-3 w-1/3 rounded bg-border/30" />
    </div>
  );
}

export function DonateTeaser() {
  return (
    <section className="tone-deep border-t border-border/60 px-5 py-20">
      <div className="mx-auto max-w-3xl sm:px-8">
        <Reveal>
          <p className="text-sm font-medium uppercase tracking-widest text-accent">
            Fund the Future
          </p>
          <h2 className="mt-3 max-w-2xl font-heading text-4xl leading-tight text-text sm:text-5xl">
            Help us reach ₦100 million
          </h2>
          <p className="mt-4 max-w-xl text-text-muted">
            Every naira goes directly to ward consultations, town halls, and community
            programs that will transform this constituency. Watch the campaign grow.
          </p>
        </Reveal>

        <Reveal delay={0.1} className="mt-10">
          <Suspense fallback={<ProgressSkeleton />}>
            <DonationProgress variant="compact" />
          </Suspense>
        </Reveal>

        <Reveal delay={0.15} className="mt-8">
          <CtaButton href="/donate" variant="primary" size="lg">
            Donate now
          </CtaButton>
        </Reveal>
      </div>
    </section>
  );
}
