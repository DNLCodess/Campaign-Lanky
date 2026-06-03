"use client";

import { useRef } from "react";
import Image from "next/image";
import { useGSAP } from "@gsap/react";
import { gsap, prefersReducedMotion, isDesktop } from "@/lib/gsap";

/**
 * The Portrait Journey — a signature scroll piece.
 * Desktop: the portrait is pinned (CSS sticky) and crossfades through three
 *   photos as the narrative chapters scroll past — present through the emotional
 *   opening, then it hands off to the rest of the page.
 * Mobile: chapters stack, each with its own inline image (mobile-light).
 * NOTE: photos are the original studio shots (with backgrounds) for now — they
 *   will be swapped for transparent cut-outs when the client provides them.
 */
const chapters = [
  {
    img: "/brand/candidate-1.jpeg",
    eyebrow: "Why I'm Running",
    title: "The voice our constituency deserves",
    body: "For too long, our potential has been sidelined. Lanky is stepping into the arena so the youth, the elders, and the hardworking entrepreneurs of Ibadan are heard loud and clear in the Green Chamber — on a simple philosophy: People First.",
  },
  {
    img: "/brand/candidate-2.jpeg",
    eyebrow: "Who He Is",
    title: "A practitioner, not just a politician",
    body: "Someone who has built businesses, mentored students, and served the community in the trenches. As CEO of Lanky First Ideal Creativity, he turns ideas into working solutions — and he intends to govern the same way.",
  },
  {
    img: "/brand/candidate-3.jpeg",
    eyebrow: "The Bridge-Builder",
    title: "Rooted in our streets",
    body: "From the vibrant markets of the Northwest to the residential hubs of the Southwest, he is a neighbour and a listener. He is not running to fill a seat — but to bridge the gap between the government and the governed.",
  },
];

export function Journey() {
  const section = useRef<HTMLDivElement>(null);
  const layer0 = useRef<HTMLDivElement>(null);
  const layer1 = useRef<HTMLDivElement>(null);
  const layer2 = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion() || !isDesktop()) return;

      // Stacked layers: top layers start hidden, fade in to crossfade 1→2→3.
      gsap.set([layer1.current, layer2.current], { opacity: 0 });
      gsap.set(layer1.current, { scale: 1.04 });
      gsap.set(layer2.current, { scale: 1.04 });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section.current,
          start: "top top",
          end: "bottom bottom",
          scrub: true,
        },
      });

      tl.to(layer1.current, { opacity: 1, scale: 1, duration: 0.2 }, 0.3)
        .to(layer2.current, { opacity: 1, scale: 1, duration: 0.2 }, 0.63);
    },
    { scope: section },
  );

  return (
    <section ref={section} className="tone-deep relative" aria-label="Meet Lanky">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:grid lg:grid-cols-2 lg:gap-16">
        {/* Narrative chapters */}
        <div>
          {chapters.map((c, i) => (
            <div
              key={i}
              className="flex flex-col justify-center py-16 lg:min-h-screen lg:py-0"
            >
              {/* Mobile inline image — skip the first chapter (the hero
                  already shows that portrait, so it would duplicate). */}
              {i !== 0 && (
                <div className="relative mb-7 aspect-4/5 w-full overflow-hidden rounded-brand border border-border lg:hidden">
                  <Image
                    src={c.img}
                    alt=""
                    fill
                    sizes="90vw"
                    className="object-cover object-top"
                  />
                  <div
                    aria-hidden
                    className="absolute inset-0"
                    style={{
                      background:
                        "linear-gradient(to top, rgba(7,26,38,0.7), rgba(7,26,38,0) 55%)",
                    }}
                  />
                </div>
              )}

              <p className="text-sm font-medium uppercase tracking-widest text-accent">
                {c.eyebrow}
              </p>
              <h2 className="mt-3 max-w-md font-heading text-4xl leading-tight text-text sm:text-5xl">
                {c.title}
              </h2>
              <p className="mt-5 max-w-md text-lg leading-relaxed text-text-muted">
                {c.body}
              </p>
            </div>
          ))}
        </div>

        {/* Pinned portrait stage (desktop) */}
        <div className="hidden lg:block">
          <div className="sticky top-0 flex h-screen items-center">
            <div className="relative aspect-4/5 w-full overflow-hidden rounded-brand border border-border bg-surface">
              {[layer0, layer1, layer2].map((ref, i) => (
                <div key={i} ref={ref} className="absolute inset-0">
                  <Image
                    src={chapters[i].img}
                    alt={i === 0 ? "Olanrewaju Okesooto" : ""}
                    fill
                    sizes="45vw"
                    className="object-cover object-top"
                  />
                </div>
              ))}
              {/* Consistent navy scrim across all layers */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    "linear-gradient(to top, rgba(7,26,38,0.8) 0%, rgba(7,26,38,0.1) 45%, rgba(7,26,38,0) 70%)",
                }}
              />
              <div className="absolute bottom-6 left-6">
                <p className="font-heading text-2xl text-white">Lanky</p>
                <p className="text-sm text-white/70">The Bridge-Builder</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
