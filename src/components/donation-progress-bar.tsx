"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, prefersReducedMotion } from "@/lib/gsap";

const GOAL = 100_000_000;

const milestones = [
  { pct: 25, label: "₦25M" },
  { pct: 50, label: "₦50M" },
  { pct: 75, label: "₦75M" },
];

const statNumber =
  "block whitespace-nowrap font-heading leading-none tabular-nums text-text";
const statNumberSize = { fontSize: "clamp(1.125rem, 7cqi, 2.5rem)" };
const statLabel =
  "mt-2.5 text-[0.6875rem] font-medium uppercase tracking-widest text-text-muted";

/** Never round real donations down to a flat "0.0%" — that reads as nothing raised. */
function fmtPct(pct: number): string {
  if (pct > 0 && pct < 0.05) return "<0.1%";
  return `${pct.toFixed(1)}%`;
}

function fmtShort(n: number): string {
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    return `₦${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M`;
  }
  if (n >= 1_000) return `₦${Math.round(n / 1_000)}K`;
  return `₦${Math.round(n).toLocaleString("en-NG")}`;
}

export function DonationProgressBar({
  raised,
  count,
  variant = "full",
}: {
  raised: number;
  count: number;
  variant?: "full" | "compact";
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const barFillRef = useRef<HTMLDivElement>(null);
  const raisedRef = useRef<HTMLSpanElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);
  const remainingRef = useRef<HTMLSpanElement>(null);

  const pct = Math.min(100, (raised / GOAL) * 100);
  const remaining = Math.max(0, GOAL - raised);
  const goalReached = raised >= GOAL;

  useGSAP(
    () => {
      const fill = barFillRef.current;
      if (!fill) return;

      const targets = [
        { ref: raisedRef, from: 0, to: raised, fmt: fmtShort },
        { ref: countRef, from: 0, to: count, fmt: (v: number) => String(Math.round(v)) },
        { ref: remainingRef, from: GOAL, to: remaining, fmt: fmtShort },
      ];

      if (prefersReducedMotion()) {
        fill.style.width = `${pct}%`;
        targets.forEach(({ ref, to, fmt }) => {
          if (ref.current) ref.current.textContent = fmt(to);
        });
        return;
      }

      const trigger = { trigger: containerRef.current, start: "top 85%", once: true };

      gsap.fromTo(fill, { width: "0%" }, { width: `${pct}%`, duration: 2, ease: "power3.out", scrollTrigger: trigger });

      targets.forEach(({ ref, from, to, fmt }) => {
        if (!ref.current) return;
        const obj = { v: from };
        gsap.to(obj, {
          v: to,
          duration: 2,
          ease: "power3.out",
          onUpdate: () => { if (ref.current) ref.current.textContent = fmt(obj.v); },
          scrollTrigger: trigger,
        });
      });
    },
    { scope: containerRef },
  );

  /* ── Compact variant (homepage teaser) ───────────────────── */
  if (variant === "compact") {
    return (
      <div ref={containerRef}>
        <div className="mb-3 flex items-end justify-between gap-4">
          <div>
            <span ref={raisedRef} className="font-heading text-3xl text-text sm:text-4xl">
              ₦0
            </span>
            <span className="ml-2 text-sm text-text-muted">raised</span>
          </div>
          <span className="mb-0.5 shrink-0 text-sm text-text-muted">of ₦100M goal</span>
        </div>

        <div className="relative">
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-border/40">
            <div
              ref={barFillRef}
              style={{ width: "0%" }}
              className="relative h-full overflow-hidden rounded-full bg-primary shadow-[0_0_10px_rgba(224,33,43,0.45)]"
              role="progressbar"
              aria-label="Fundraising progress"
              aria-valuenow={Math.round(pct)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                aria-hidden
                className="absolute inset-y-0 w-1/2 bg-linear-to-r from-transparent via-white/20 to-transparent"
                style={{ animation: "lanky-shimmer 2.8s ease-in-out infinite" }}
              />
            </div>
          </div>
        </div>

        <div className="mt-2.5 flex items-center gap-3 text-xs text-text-muted">
          <span
            ref={countRef}
            className="inline-flex items-center gap-1 rounded-full border border-border bg-surface/60 px-2.5 py-0.5 font-medium text-text"
          >
            0
          </span>
          <span>donors &middot; {fmtPct(pct)} of goal</span>
          {goalReached && <span className="font-medium text-accent">Goal reached!</span>}
        </div>
      </div>
    );
  }

  /* ── Full variant (donate page) ──────────────────────────── */
  return (
    <div ref={containerRef} className="space-y-8">

      {/* Three-stat card — numerals scale to the card, not the viewport, so the
          same markup fits a half-width column and a full-width dashboard panel. */}
      <div
        className="grid grid-cols-3 divide-x divide-border/60 overflow-hidden rounded-brand border border-border"
        style={{
          containerType: "inline-size",
          background:
            "radial-gradient(ellipse at 100% 0%, rgba(103,156,188,0.10) 0%, transparent 60%), rgba(13,51,74,0.35)",
        }}
      >
        <div className="px-2 py-6 text-center sm:py-7">
          <span ref={raisedRef} className={statNumber} style={statNumberSize}>
            ₦0
          </span>
          <p className={statLabel}>Raised</p>
        </div>
        <div className="px-2 py-6 text-center sm:py-7">
          <span ref={countRef} className={statNumber} style={statNumberSize}>
            0
          </span>
          <p className={statLabel}>{count === 1 ? "Donor" : "Donors"}</p>
        </div>
        <div className="px-2 py-6 text-center sm:py-7">
          <span ref={remainingRef} className={statNumber} style={statNumberSize}>
            ₦100M
          </span>
          <p className={statLabel}>To Go</p>
        </div>
      </div>

      {/* Progress bar with milestones */}
      <div>
        {/* Milestone labels row */}
        <div className="relative mb-2 h-5">
          {milestones.map((m) => (
            <span
              key={m.pct}
              className={`absolute -translate-x-1/2 whitespace-nowrap text-xs font-medium tabular-nums transition-colors duration-700 ${
                pct >= m.pct ? "text-accent" : "text-text-muted/40"
              }`}
              style={{ left: `${m.pct}%` }}
            >
              {m.label}
            </span>
          ))}
        </div>

        {/* Track + fill + pulse dot */}
        <div className="relative">
          <div
            className="relative h-5 w-full overflow-hidden rounded-full bg-border/40"
            role="progressbar"
            aria-label="Fundraising progress"
            aria-valuenow={Math.round(pct)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuetext={`${fmtShort(raised)} raised of ₦100M`}
          >
            {/* Milestone tick marks */}
            {milestones.map((m) => (
              <div
                key={m.pct}
                aria-hidden
                className="absolute top-0 h-full w-px bg-bg/50"
                style={{ left: `${m.pct}%` }}
              />
            ))}

            {/* Animated fill with shimmer. A minimum width keeps the first
                donations visible instead of rendering a sub-pixel sliver. */}
            <div
              ref={barFillRef}
              style={{ width: "0%", minWidth: raised > 0 ? "1.25rem" : undefined }}
              className="relative h-full overflow-hidden rounded-full bg-primary shadow-[0_0_18px_rgba(224,33,43,0.6)]"
            >
              <div
                aria-hidden
                className="absolute inset-y-0 w-1/2 bg-linear-to-r from-transparent via-white/18 to-transparent"
                style={{ animation: "lanky-shimmer 2.8s ease-in-out infinite" }}
              />
            </div>
          </div>

          {/* Pulse dot rides the leading edge — max() keeps it on the fill even
              when the minimum width is doing the work at low percentages. */}
          {pct > 0 && pct < 99 && (
            <div
              aria-hidden
              className="absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
              style={{ left: `max(1.25rem, ${pct}%)` }}
            >
              <span className="relative flex h-5 w-5 items-center justify-center">
                <span className="absolute h-full w-full animate-ping rounded-full bg-primary/50" />
                <span className="h-3 w-3 rounded-full bg-white shadow-md" />
              </span>
            </div>
          )}
        </div>

        {/* Footer row */}
        <div className="mt-3 flex items-center justify-between gap-4 text-xs text-text-muted">
          <span className="tabular-nums">
            {fmtPct(pct)} of goal
            {goalReached && (
              <span className="ml-2 font-medium text-accent">Goal reached!</span>
            )}
          </span>
          <span className="whitespace-nowrap tabular-nums">Goal: ₦100,000,000</span>
        </div>
      </div>
    </div>
  );
}
