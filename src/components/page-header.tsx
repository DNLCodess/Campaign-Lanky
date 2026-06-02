import { Reveal } from "@/components/motion/reveal";

/** Consistent page hero: eyebrow + title + optional intro, on a subtle glow. */
export function PageHeader({
  eyebrow,
  title,
  intro,
}: {
  eyebrow: string;
  title: string;
  intro?: string;
}) {
  return (
    <section className="relative overflow-hidden border-b border-border/60">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(55% 60% at 70% 0%, rgba(103,156,188,0.16), transparent 70%), radial-gradient(45% 60% at 0% 100%, rgba(194,23,32,0.10), transparent 70%)",
        }}
      />
      <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:py-24">
        <Reveal>
          <p className="text-sm font-medium uppercase tracking-widest text-accent">
            {eyebrow}
          </p>
          <h1 className="mt-4 max-w-3xl font-heading text-5xl leading-[1.05] tracking-tight text-text sm:text-6xl">
            {title}
          </h1>
          {intro && (
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-text-muted">
              {intro}
            </p>
          )}
        </Reveal>
      </div>
    </section>
  );
}
