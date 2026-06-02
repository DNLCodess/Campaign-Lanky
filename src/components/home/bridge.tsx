"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, prefersReducedMotion } from "@/lib/gsap";

/**
 * The Bridge Draw — signature moment for "The Bridge-Builder".
 * An SVG bridge that draws itself on scroll (deck + arch + hangers), connecting
 * GOVERNMENT and THE PEOPLE. Uses the pathLength=1 + strokeDashoffset technique
 * so no DrawSVG plugin is needed. Honors reduced-motion (renders fully drawn).
 */
export function Bridge() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const lines = gsap.utils.toArray<SVGPathElement | SVGLineElement>(".draw");

      if (prefersReducedMotion()) {
        gsap.set(lines, { strokeDashoffset: 0 });
        gsap.set(".keystone", { opacity: 1, scale: 1 });
        return;
      }

      gsap.set(lines, { strokeDasharray: 1, strokeDashoffset: 1 });
      gsap.set(".keystone", { opacity: 0, scale: 0.6, transformOrigin: "center" });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: root.current,
          start: "top 75%",
          end: "bottom 70%",
          scrub: true,
        },
      });

      tl.to(".deck", { strokeDashoffset: 0, duration: 1 }, 0)
        .to(".arch", { strokeDashoffset: 0, duration: 1 }, 0.1)
        .to(".hanger", { strokeDashoffset: 0, duration: 0.6, stagger: 0.05 }, 0.5)
        .to(".keystone", { opacity: 1, scale: 1, duration: 0.4 }, 0.85);
    },
    { scope: root },
  );

  // Hanger x-positions along the deck.
  const hangers = [170, 290, 410, 590, 710, 830];

  return (
    <section
      ref={root}
      className="relative overflow-hidden border-y border-border/60 bg-surface/20 py-24"
    >
      <div className="mx-auto max-w-4xl px-5 text-center sm:px-8">
        <p className="text-sm font-medium uppercase tracking-widest text-accent">
          The Bridge-Builder
        </p>
        <h2 className="mx-auto mt-3 max-w-2xl font-heading text-4xl leading-tight text-text sm:text-5xl">
          Bridging the gap between the government and the governed
        </h2>
      </div>

      <div className="mx-auto mt-14 max-w-5xl px-5 sm:px-8">
        <svg
          viewBox="0 0 1000 280"
          fill="none"
          className="w-full"
          role="img"
          aria-label="A bridge connecting government and the people"
        >
          {/* Arch */}
          <path
            d="M40 210 Q500 30 960 210"
            className="draw arch"
            stroke="var(--accent)"
            strokeWidth="2.5"
            pathLength={1}
          />
          {/* Deck */}
          <path
            d="M40 210 L960 210"
            className="draw deck"
            stroke="var(--text)"
            strokeWidth="3"
            pathLength={1}
          />
          {/* Hangers (arch → deck) */}
          {hangers.map((x) => {
            // approximate arch y at x for the quadratic Q500,30
            const t = x / 1000;
            const archY = 210 * (1 - t) * (1 - t) + 30 * 2 * (1 - t) * t + 210 * t * t;
            return (
              <line
                key={x}
                x1={x}
                y1={archY}
                x2={x}
                y2={210}
                className="draw hanger"
                stroke="var(--border)"
                strokeWidth="1.5"
                pathLength={1}
              />
            );
          })}
          {/* End anchors */}
          <circle cx="40" cy="210" r="5" fill="var(--primary)" />
          <circle cx="960" cy="210" r="5" fill="var(--primary)" />

          {/* Keystone — window-pane mark at center */}
          <g className="keystone" transform="translate(500 120)">
            <rect x="-14" y="-14" width="12" height="12" rx="2" fill="none" stroke="var(--text)" strokeWidth="1.5" />
            <rect x="2" y="-14" width="12" height="12" rx="2" fill="var(--accent)" />
            <rect x="-14" y="2" width="12" height="12" rx="2" fill="var(--steel)" />
            <rect x="2" y="2" width="12" height="12" rx="2" fill="var(--primary)" />
          </g>
        </svg>

        <div className="mt-4 flex items-center justify-between font-heading text-lg text-text-muted sm:text-xl">
          <span>Government</span>
          <span>The People</span>
        </div>
      </div>
    </section>
  );
}
