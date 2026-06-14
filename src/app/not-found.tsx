import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page Not Found",
  robots: { index: false, follow: false },
};

const PARTICLES: Array<{
  size: number;
  top: string;
  left: string;
  delay: number;
  dur: number;
  color: string;
}> = [
  { size: 3,  top: "11%", left: "7%",  delay: 0,    dur: 7,  color: "var(--primary)" },
  { size: 5,  top: "7%",  left: "84%", delay: 1.5,  dur: 5,  color: "var(--accent)"  },
  { size: 2,  top: "28%", left: "3%",  delay: 0.7,  dur: 9,  color: "var(--accent)"  },
  { size: 4,  top: "22%", left: "93%", delay: 2,    dur: 6,  color: "var(--primary)" },
  { size: 6,  top: "62%", left: "5%",  delay: 1,    dur: 8,  color: "var(--accent)"  },
  { size: 3,  top: "68%", left: "90%", delay: 3,    dur: 7,  color: "rgba(255,255,255,0.4)" },
  { size: 4,  top: "44%", left: "2%",  delay: 0.5,  dur: 6,  color: "var(--primary)" },
  { size: 2,  top: "82%", left: "28%", delay: 2.5,  dur: 5,  color: "var(--accent)"  },
  { size: 5,  top: "88%", left: "72%", delay: 1.2,  dur: 8,  color: "rgba(255,255,255,0.3)" },
  { size: 3,  top: "52%", left: "96%", delay: 0.3,  dur: 7,  color: "var(--accent)"  },
  { size: 4,  top: "16%", left: "48%", delay: 1.8,  dur: 9,  color: "var(--primary)" },
  { size: 2,  top: "93%", left: "52%", delay: 2.2,  dur: 6,  color: "var(--accent)"  },
];

export default function NotFound() {
  return (
    <div className="relative isolate flex min-h-[calc(100vh-5rem)] flex-col items-center justify-center overflow-hidden px-5 py-20 text-center">

      {/* ── Ambient radial glows ─────────────────────────────── */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-20"
        style={{
          background: [
            "radial-gradient(58% 52% at 18% 14%, rgba(194,23,32,0.22), transparent 58%)",
            "radial-gradient(52% 52% at 82% 82%, rgba(103,156,188,0.20), transparent 58%)",
          ].join(","),
        }}
      />

      {/* ── Dot grid ─────────────────────────────────────────── */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(103,156,188,0.13) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* ── Floating particles ───────────────────────────────── */}
      {PARTICLES.map((p, i) => (
        <div
          key={i}
          aria-hidden
          className="pointer-events-none absolute rounded-full"
          style={{
            width: p.size,
            height: p.size,
            top: p.top,
            left: p.left,
            background: p.color,
            animation: `nf-float ${p.dur}s ease-in-out ${p.delay}s infinite`,
          }}
        />
      ))}

      {/* ── SVG illustration: map pin ─────────────────────────── */}
      <svg
        viewBox="0 0 200 246"
        aria-hidden
        className="w-36 sm:w-44 drop-shadow-[0_0_48px_rgba(103,156,188,0.18)]"
      >
        <defs>
          <clipPath id="nf-pin-clip">
            <circle cx="100" cy="86" r="62" />
          </clipPath>
          <radialGradient id="nf-pin-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#7fb0d0" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#071a26" stopOpacity="0"    />
          </radialGradient>
          <radialGradient id="nf-inner-grad" cx="35%" cy="30%" r="70%">
            <stop offset="0%"   stopColor="#0d334a" />
            <stop offset="100%" stopColor="#050e16" />
          </radialGradient>
          <filter id="nf-soft-glow">
            <feGaussianBlur stdDeviation="10" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Ambient halo */}
        <circle cx="100" cy="86" r="90" fill="url(#nf-pin-glow)" />

        {/* Radar rings — staggered */}
        <ellipse
          cx="100" cy="224" rx="30" ry="9"
          fill="none" stroke="#7fb0d0" strokeWidth="1.2"
          style={{
            animation: "nf-radar 3.2s ease-out 0s infinite",
            transformOrigin: "100px 224px",
          }}
        />
        <ellipse
          cx="100" cy="224" rx="30" ry="9"
          fill="none" stroke="#7fb0d0" strokeWidth="1.2"
          style={{
            animation: "nf-radar 3.2s ease-out 1.6s infinite",
            transformOrigin: "100px 224px",
          }}
        />

        {/* Pin shadow */}
        <ellipse cx="100" cy="224" rx="27" ry="8" fill="rgba(0,0,0,0.38)" />

        {/* Outer slow-spinning dashed ring */}
        <circle
          cx="100" cy="86" r="79"
          fill="none"
          stroke="#679cbc"
          strokeWidth="0.8"
          strokeDasharray="5 9"
          opacity="0.28"
          style={{
            animation: "nf-spin-slow 28s linear infinite",
            transformOrigin: "100px 86px",
          }}
        />
        {/* Inner counter-spinning dashed ring */}
        <circle
          cx="100" cy="86" r="70"
          fill="none"
          stroke="#e0212b"
          strokeWidth="0.6"
          strokeDasharray="3 12"
          opacity="0.18"
          style={{
            animation: "nf-spin-ccw 18s linear infinite",
            transformOrigin: "100px 86px",
          }}
        />

        {/* Pin body — teardrop path */}
        <path
          d="M100 214 C55 178, 30 136, 30 86 A70 70 0 1 1 170 86 C170 136, 145 178, 100 214 Z"
          fill="url(#nf-inner-grad)"
          stroke="#679cbc"
          strokeWidth="1.6"
        />

        {/* Map grid lines, clipped to pin circle */}
        <g clipPath="url(#nf-pin-clip)" stroke="#7fb0d0" strokeWidth="0.7" opacity="0.18">
          <line x1="58"  y1="20"  x2="58"  y2="152" />
          <line x1="79"  y1="20"  x2="79"  y2="152" />
          <line x1="100" y1="20"  x2="100" y2="152" />
          <line x1="121" y1="20"  x2="121" y2="152" />
          <line x1="142" y1="20"  x2="142" y2="152" />
          <line x1="36"  y1="44"  x2="164" y2="44"  />
          <line x1="36"  y1="65"  x2="164" y2="65"  />
          <line x1="36"  y1="86"  x2="164" y2="86"  />
          <line x1="36"  y1="107" x2="164" y2="107" />
          <line x1="36"  y1="128" x2="164" y2="128" />
        </g>

        {/* Inner glow ring — accent */}
        <circle
          cx="100" cy="86" r="48"
          fill="none"
          stroke="#7fb0d0"
          strokeWidth="0.8"
          opacity="0.22"
        />

        {/* Cross-hair lines */}
        <g stroke="#7fb0d0" strokeWidth="0.8" opacity="0.35">
          <line x1="100" y1="46" x2="100" y2="60" strokeLinecap="round" />
          <line x1="100" y1="112" x2="100" y2="126" strokeLinecap="round" />
          <line x1="60"  y1="86" x2="74"  y2="86"  strokeLinecap="round" />
          <line x1="126" y1="86" x2="140" y2="86"  strokeLinecap="round" />
        </g>

        {/* Central "?" */}
        <text
          x="100" y="105"
          textAnchor="middle"
          fontSize="54"
          fontWeight="800"
          fontFamily="Georgia, 'Times New Roman', serif"
          fill="#e0212b"
          opacity="0.92"
          filter="url(#nf-soft-glow)"
        >
          ?
        </text>

        {/* Pin tip accent dot */}
        <circle cx="100" cy="214" r="3.5" fill="#679cbc" opacity="0.8" />
      </svg>

      {/* ── "404" numeral ─────────────────────────────────────── */}
      <div
        className="mt-5 select-none font-heading text-[88px] leading-none tracking-tight sm:text-[130px]"
        style={{
          background:
            "linear-gradient(130deg, #7fb0d0 0%, #f4f8fb 42%, #e0212b 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}
      >
        404
      </div>

      {/* ── Divider line ─────────────────────────────────────── */}
      <div className="relative mt-2 flex w-56 items-center gap-3 sm:w-72">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
        <svg viewBox="0 0 14 14" className="h-2.5 w-2.5 shrink-0 text-accent/50" fill="currentColor" aria-hidden>
          <polygon points="7,1 13,13 1,13" />
        </svg>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>

      {/* ── Headline ─────────────────────────────────────────── */}
      <h1 className="mt-5 font-heading text-2xl text-text sm:text-3xl">
        Off the map.
      </h1>

      {/* ── Body copy ────────────────────────────────────────── */}
      <p className="mt-3 max-w-xs text-base leading-relaxed text-text-muted sm:max-w-sm">
        This page isn&apos;t part of our constituency&nbsp;— but the
        movement most certainly is.
      </p>

      {/* ── CTAs ─────────────────────────────────────────────── */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="rounded-brand bg-primary px-6 py-2.5 text-sm font-medium text-white transition-all hover:bg-primary-hover hover:shadow-[0_0_20px_rgba(224,33,43,0.35)]"
        >
          Campaign HQ
        </Link>
        <Link
          href="/get-involved"
          className="rounded-brand border border-border px-6 py-2.5 text-sm text-text-muted transition-colors hover:border-accent hover:text-text"
        >
          Get involved
        </Link>
        <Link
          href="/donate"
          className="rounded-brand border border-border px-6 py-2.5 text-sm text-text-muted transition-colors hover:border-accent hover:text-text"
        >
          Donate
        </Link>
      </div>

      {/* ── Breadcrumb nav hint ───────────────────────────────── */}
      <p className="mt-10 text-xs text-text-muted/40">
        Or explore{" "}
        <Link href="/news"        className="text-accent/60 underline-offset-2 hover:text-accent hover:underline">news</Link>
        {" · "}
        <Link href="/manifesto"   className="text-accent/60 underline-offset-2 hover:text-accent hover:underline">manifesto</Link>
        {" · "}
        <Link href="/about"       className="text-accent/60 underline-offset-2 hover:text-accent hover:underline">about</Link>
        {" · "}
        <Link href="/wards"       className="text-accent/60 underline-offset-2 hover:text-accent hover:underline">wards</Link>
      </p>
    </div>
  );
}
