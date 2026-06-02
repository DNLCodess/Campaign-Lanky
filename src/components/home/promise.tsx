import { Reveal } from "@/components/motion/reveal";
import { site } from "@/lib/site";

export function PromiseQuote() {
  return (
    <section className="relative overflow-hidden bg-linear-to-b from-bg to-surface/40 py-24">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(50% 60% at 50% 0%, rgba(103,156,188,0.12), transparent 70%)",
        }}
      />
      <div className="mx-auto max-w-4xl px-5 text-center sm:px-8">
        <Reveal>
          {/* Window-pane motif mark instead of a cliché quote icon */}
          <div className="mx-auto grid h-10 w-10 grid-cols-2 grid-rows-2 gap-1.5">
            <span className="rounded-[3px] bg-transparent ring-1 ring-border" />
            <span className="rounded-[3px] bg-navy" />
            <span className="rounded-[3px] bg-steel" />
            <span className="rounded-[3px] bg-primary" />
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <blockquote className="mt-8 font-heading text-3xl leading-snug text-text sm:text-4xl md:text-[2.75rem]">
            “I am not running to fill a seat; I am running to bridge the gap between
            the government and the governed. Together, we can build a constituency
            where every resident has the opportunity to succeed.”
          </blockquote>
        </Reveal>

        <Reveal delay={0.2}>
          <p className="mt-8 font-heading text-lg text-accent">{site.candidate}</p>
          <p className="text-sm text-text-muted">{site.tagline}</p>
        </Reveal>
      </div>
    </section>
  );
}
