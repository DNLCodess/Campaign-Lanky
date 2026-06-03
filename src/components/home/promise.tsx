import Image from "next/image";
import { Reveal } from "@/components/motion/reveal";
import { site } from "@/lib/site";

export function PromiseQuote() {
  return (
    <section className="tone-aurora relative overflow-hidden py-24">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        {/* Candidate cut-out */}
        <Reveal className="order-1">
          <div
            className="relative mx-auto aspect-4/5 w-full max-w-xs overflow-hidden rounded-brand border border-border"
            style={{
              backgroundColor: "#0b2a3d",
              backgroundImage:
                "radial-gradient(110% 75% at 50% 12%, rgba(103,156,188,0.3), transparent 62%)",
            }}
          >
            <Image
              src="/brand/candidate-4.png"
              alt={site.candidate}
              fill
              sizes="(max-width: 1024px) 80vw, 30vw"
              className="object-contain object-bottom"
            />
          </div>
        </Reveal>

        {/* Quote */}
        <div className="order-2 text-center lg:text-left">
          <Reveal>
            <div className="mx-auto grid h-10 w-10 grid-cols-2 grid-rows-2 gap-1.5 lg:mx-0">
              <span className="rounded-xs bg-transparent ring-1 ring-border" />
              <span className="rounded-xs bg-navy" />
              <span className="rounded-xs bg-steel" />
              <span className="rounded-xs bg-primary" />
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <blockquote className="mt-7 font-heading text-3xl leading-snug text-text sm:text-4xl">
              “I am not running to fill a seat; I am running to bridge the gap between
              the government and the governed. Together, we can build a constituency
              where every resident has the opportunity to succeed.”
            </blockquote>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="mt-7 font-heading text-lg text-accent">{site.candidate}</p>
            <p className="text-sm text-text-muted">{site.tagline}</p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
