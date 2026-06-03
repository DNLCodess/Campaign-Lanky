"use client";

import { useRef } from "react";
import Image from "next/image";
import { useGSAP } from "@gsap/react";
import { gsap, prefersReducedMotion, isDesktop } from "@/lib/gsap";

/**
 * The Portrait Journey — a signature scroll piece.
 * Desktop: the portrait is pinned (CSS sticky) and crossfades through three
 *   transparent cut-outs as the narrative chapters scroll past.
 * Mobile: chapters stack, each with its own inline image (mobile-light).
 */
const chapters = [
  {
    img: "/brand/candidate-4.png",
    eyebrow: "Why I'm Running",
    title: "The voice our constituency deserves",
    body: "For too long, our potential has been sidelined. Lanky is stepping into the arena so the youth, the elders, and the hardworking entrepreneurs of Ibadan are heard loud and clear in the Green Chamber — on a simple philosophy: People First.",
  },
  {
    img: "/brand/candidate-5.png",
    eyebrow: "Who He Is",
    title: "A practitioner, not just a politician",
    body: "Someone who has built businesses, mentored students, and served the community in the trenches. As CEO of Lanky First Ideal Creativity, he turns ideas into working solutions — and he intends to govern the same way.",
  },
  {
    img: "/brand/candidate-6.png",
    eyebrow: "The Bridge-Builder",
    title: "Rooted in our streets",
    body: "From the vibrant markets of the Northwest to the residential hubs of the Southwest, he is a neighbour and a listener. He is not running to fill a seat — but to bridge the gap between the government and the governed.",
  },
];

// Branded backdrop for the transparent cut-outs (steel glow over deep navy)
// plus a faint window-pane grid.
const backdrop: React.CSSProperties = {
  backgroundColor: "#0b2a3d",
  backgroundImage:
    "radial-gradient(110% 75% at 50% 12%, rgba(103,156,188,0.28), transparent 62%), radial-gradient(80% 60% at 50% 100%, rgba(194,23,32,0.12), transparent 70%)",
};

export function Journey() {
  const section = useRef<HTMLDivElement>(null);
  const layer0 = useRef<HTMLDivElement>(null);
  const layer1 = useRef<HTMLDivElement>(null);
  const layer2 = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion() || !isDesktop()) return;

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
    <section
      ref={section}
      className="tone-navy relative border-t border-border/60"
      aria-label="Meet Lanky"
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:grid lg:grid-cols-2 lg:gap-16">
        {/* Narrative chapters */}
        <div>
          {chapters.map((c, i) => (
            <div
              key={i}
              className="flex flex-col justify-center py-16 lg:min-h-screen lg:py-0"
            >
              {/* Mobile inline image — skip the first chapter (the hero leads). */}
              {i !== 0 && (
                <div
                  className="relative mb-7 aspect-4/5 w-full overflow-hidden rounded-brand border border-border lg:hidden"
                  style={backdrop}
                >
                  <Image
                    src={c.img}
                    alt=""
                    fill
                    sizes="90vw"
                    className="object-contain object-bottom"
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
            <div
              className="relative aspect-4/5 w-full overflow-hidden rounded-brand border border-border"
              style={backdrop}
            >
              {/* faint window-pane texture */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-[0.05]"
                style={{
                  backgroundImage:
                    "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
                  backgroundSize: "56px 56px",
                }}
              />
              {[layer0, layer1, layer2].map((ref, i) => (
                <div key={i} ref={ref} className="absolute inset-0">
                  <Image
                    src={chapters[i].img}
                    alt={i === 0 ? "Olanrewaju Okesooto" : ""}
                    fill
                    sizes="45vw"
                    className="object-contain object-bottom"
                  />
                </div>
              ))}
              {/* nameplate */}
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <div
                  aria-hidden
                  className="absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(to top, rgba(6,18,26,0.6), transparent)",
                  }}
                />
                <div className="relative">
                  <p className="font-heading text-2xl text-white">Lanky</p>
                  <p className="text-sm text-white/70">The Bridge-Builder</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
