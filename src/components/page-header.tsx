import Image from "next/image";
import { Reveal } from "@/components/motion/reveal";

/**
 * Consistent page hero: eyebrow + title + optional intro.
 * Pass `image` to use a constituency photo as the background (with a heavy
 * navy scrim for legibility); otherwise falls back to the aurora glow.
 */
export function PageHeader({
  eyebrow,
  title,
  intro,
  image,
}: {
  eyebrow: string;
  title: string;
  intro?: string;
  image?: string;
}) {
  return (
    <section
      className={`relative overflow-hidden border-b border-border/60 ${image ? "" : "tone-aurora"}`}
    >
      {image && (
        <>
          <Image
            src={image}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(90deg, rgba(6,18,26,0.95) 0%, rgba(6,18,26,0.82) 45%, rgba(6,18,26,0.55) 100%), linear-gradient(0deg, rgba(6,18,26,0.9) 0%, rgba(6,18,26,0.2) 60%)",
            }}
          />
        </>
      )}
      <div className="relative mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:py-24">
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
