import Image from "next/image";
import { Reveal } from "@/components/motion/reveal";
import { cn } from "@/lib/cn";

/**
 * The Portrait Journey — "Meet Lanky".
 * A robust alternating layout: each chapter pairs a transparent cut-out (on a
 * branded backdrop) with its narrative. Works identically with or without
 * motion, on mobile or desktop — no JS-dependent crossfade, no empty columns.
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

// Branded backdrop for the transparent cut-outs (steel glow over deep navy).
const backdrop: React.CSSProperties = {
  backgroundColor: "#0b2a3d",
  backgroundImage:
    "radial-gradient(110% 75% at 50% 12%, rgba(103,156,188,0.28), transparent 62%), radial-gradient(80% 60% at 50% 100%, rgba(194,23,32,0.12), transparent 70%)",
};

export function Journey() {
  return (
    <section
      className="tone-navy relative border-t border-border/60"
      aria-label="Meet Lanky"
    >
      <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8">
        {chapters.map((c, i) => {
          const flip = i % 2 === 1;
          return (
            <Reveal
              key={i}
              className="grid items-center gap-8 py-12 lg:grid-cols-2 lg:gap-16 lg:py-16"
            >
              {/* Portrait */}
              <div className={cn(flip && "lg:order-2")}>
                <div
                  className="relative mx-auto aspect-4/5 w-full max-w-sm overflow-hidden rounded-brand border border-border"
                  style={backdrop}
                >
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 opacity-[0.05]"
                    style={{
                      backgroundImage:
                        "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
                      backgroundSize: "52px 52px",
                    }}
                  />
                  <Image
                    src={c.img}
                    alt={i === 0 ? "Olanrewaju Okesooto" : ""}
                    fill
                    sizes="(max-width: 1024px) 90vw, 40vw"
                    className="object-contain object-bottom"
                  />
                </div>
              </div>

              {/* Narrative */}
              <div className={cn(flip && "lg:order-1")}>
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
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
