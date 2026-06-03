"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useGSAP } from "@gsap/react";
import { gsap, prefersReducedMotion } from "@/lib/gsap";
import { site } from "@/lib/site";
import { CtaButton } from "@/components/ui/cta-button";
import { PartyState } from "@/components/party-state";

const slides = site.constituencySlides;

// Distinct brand gradients so any placeholder slides (no `src`) still read as
// designed, textured backgrounds.
const placeholderGradients = [
  "linear-gradient(135deg,#0d334a 0%,#06141d 75%)",
  "linear-gradient(135deg,#103a52 0%,#0a1b25 70%)",
  "linear-gradient(120deg,#0e3346 0%,#071a26 80%)",
  "linear-gradient(135deg,#0c2f44 0%,#1a0e12 90%)",
];

export function Hero() {
  const root = useRef<HTMLDivElement>(null);
  const layerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [active, setActive] = useState(0);

  // Auto-advance the slider (always on).
  useEffect(() => {
    if (slides.length < 2) return;
    const id = setInterval(
      () => setActive((i) => (i + 1) % slides.length),
      6000,
    );
    return () => clearInterval(id);
  }, []);

  // Buttery crossfade + slow cinematic zoom, GSAP-driven for full control.
  useGSAP(
    () => {
      const layers = layerRefs.current;
      const reduce = prefersReducedMotion();

      layers.forEach((layer, i) => {
        if (!layer) return;
        const img = layer.querySelector<HTMLElement>("[data-img]");
        const isActive = i === active;

        if (reduce) {
          gsap.set(layer, { autoAlpha: isActive ? 1 : 0 });
          if (img) gsap.set(img, { scale: 1, xPercent: 0 });
          return;
        }

        gsap.killTweensOf(layer);
        if (isActive) {
          gsap.to(layer, {
            autoAlpha: 1,
            duration: 1.6,
            ease: "power2.inOut",
            overwrite: "auto",
          });
          if (img) {
            gsap.killTweensOf(img);
            // Settle the incoming image, then keep a slow drift for the whole slide.
            gsap.fromTo(
              img,
              { scale: 1.16, xPercent: 1.5 },
              { scale: 1.04, xPercent: 0, duration: 2.2, ease: "power3.out" },
            );
            gsap.to(img, {
              scale: 1.1,
              duration: 6,
              ease: "sine.inOut",
              delay: 2.2,
            });
          }
        } else {
          gsap.to(layer, {
            autoAlpha: 0,
            duration: 1.6,
            ease: "power2.inOut",
            overwrite: "auto",
          });
        }
      });
    },
    { dependencies: [active], scope: root },
  );

  // Text intro
  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.from(".hero-badge", { opacity: 0, y: 16, duration: 0.6 })
        .from(".hero-eyebrow", { opacity: 0, y: 14, duration: 0.5 }, "-=0.3")
        .from(
          ".hero-word",
          { opacity: 0, yPercent: 120, duration: 0.9, stagger: 0.07 },
          "-=0.2",
        )
        .from(".hero-sub", { opacity: 0, y: 20, duration: 0.7 }, "-=0.5")
        .from(
          ".hero-cta",
          { opacity: 0, y: 20, duration: 0.6, stagger: 0.1 },
          "-=0.4",
        );
    },
    { scope: root },
  );

  const words = "Securing Our Future, Together.".split(" ");

  return (
    <section
      ref={root}
      className="relative flex min-h-[90vh] items-center overflow-hidden"
      aria-label="Introduction"
    >
      {/* Constituency slider */}
      <div aria-hidden className="absolute inset-0 -z-20 bg-bg">
        {slides.map((slide, i) => (
          <div
            key={slide.name}
            ref={(el) => {
              layerRefs.current[i] = el;
            }}
            className="absolute inset-0 will-change-[opacity]"
            style={{ opacity: i === 0 ? 1 : 0 }}
          >
            <div data-img className="absolute inset-0 will-change-transform">
              {slide.src ? (
                <Image
                  src={slide.src}
                  alt=""
                  fill
                  priority={i === 0}
                  sizes="100vw"
                  className="object-cover"
                />
              ) : (
                <div
                  className="h-full w-full"
                  style={{
                    backgroundImage:
                      placeholderGradients[i % placeholderGradients.length],
                  }}
                >
                  <div
                    className="h-full w-full opacity-[0.06]"
                    style={{
                      backgroundImage:
                        "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
                      backgroundSize: "64px 64px",
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Legibility scrim (darkest on the left, under the text) */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background:
            "linear-gradient(90deg, rgba(6,18,26,0.96) 0%, rgba(6,18,26,0.82) 38%, rgba(6,18,26,0.45) 72%, rgba(6,18,26,0.35) 100%), linear-gradient(0deg, rgba(6,18,26,0.85) 0%, rgba(6,18,26,0) 40%)",
        }}
      />

      <div className="mx-auto w-full max-w-7xl px-5 py-20 sm:px-8">
        <div className="max-w-2xl">
          {/* Party + State — front and centre */}
          <div className="hero-badge inline-flex items-center gap-3 rounded-full border border-border bg-surface/60 px-4 py-2 text-sm text-text backdrop-blur-sm">
            <PartyState />
          </div>

          <p className="hero-eyebrow mt-6 text-sm font-medium uppercase tracking-widest text-accent">
            {site.office} · {site.constituency}
          </p>

          <h1 className="mt-4 font-heading text-5xl leading-[1.02] tracking-tight text-text sm:text-6xl lg:text-7xl">
            <span className="block overflow-hidden">
              <span className="hero-word inline-block text-accent">Innovation</span>{" "}
              <span className="hero-word inline-block">for Ibadan.</span>
            </span>
            <span className="mt-2 block text-text-muted">
              {words.map((w, i) => (
                <span key={i} className="inline-block overflow-hidden align-bottom">
                  <span className="hero-word inline-block">{w}&nbsp;</span>
                </span>
              ))}
            </span>
          </h1>

          <p className="hero-sub mt-6 max-w-xl text-lg leading-relaxed text-text-muted">
            {site.candidate} — <em className="text-text">{site.tagline}</em>.
            Building a digitally empowered, educated, and prosperous constituency
            where every citizen has a voice and every youth has an opportunity.
          </p>

          <div className="mt-9 flex flex-wrap gap-4">
            <span className="hero-cta">
              <CtaButton href={site.cta.donate.href} variant="primary" size="lg">
                {site.cta.donate.label}
              </CtaButton>
            </span>
            <span className="hero-cta">
              <CtaButton href={site.cta.volunteer.href} variant="outline" size="lg">
                {site.cta.volunteer.label}
              </CtaButton>
            </span>
          </div>
        </div>
      </div>

      {/* Slider controls + current location */}
      <div className="absolute inset-x-0 bottom-6 z-10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 sm:px-8">
          <div className="flex items-center gap-2">
            {slides.map((slide, i) => (
              <button
                key={slide.name}
                type="button"
                onClick={() => setActive(i)}
                aria-label={`Show ${slide.name}`}
                className="h-1.5 rounded-full transition-all duration-500"
                style={{
                  width: i === active ? 28 : 10,
                  backgroundColor:
                    i === active ? "var(--primary)" : "rgba(255,255,255,0.35)",
                }}
              />
            ))}
          </div>
          <p className="text-xs text-text-muted">
            <span className="text-text">{slides[active].name}</span> ·{" "}
            {slides[active].note}
          </p>
        </div>
      </div>
    </section>
  );
}
