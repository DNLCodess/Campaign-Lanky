"use client";

import { useActionState, useState } from "react";
import Image from "next/image";
import { loginPortal, type PortalActionState } from "@/app/portal/actions/auth";

const initial: PortalActionState = {};

const TRUST_MARKERS = ["Agent-verified", "Result-sheet backed", "Checksummed"];

export default function PortalLoginPage() {
  const [state, formAction, isPending] = useActionState(loginPortal, initial);
  const [showPassword, setShowPassword] = useState(false);

  // Submit on Enter from either field. Native implicit submission already does
  // this, but requestSubmit() keeps it reliable across browsers and makes the
  // behaviour explicit (and still routes through the useActionState action).
  function submitOnEnter(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !isPending) {
      e.preventDefault();
      e.currentTarget.form?.requestSubmit();
    }
  }

  return (
    <div className="tone-aurora relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-12">
      {/* Faint polling-unit grid */}
      <div className="portal-grid pointer-events-none absolute inset-0" aria-hidden />
      {/* Radar-ring accent, lower-left */}
      <div className="pointer-events-none absolute -bottom-24 -left-24 hidden sm:block" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="absolute h-40 w-40 rounded-full border border-accent/40 motion-reduce:hidden"
            style={{ animation: `portal-radar 6s ${i * 2}s ease-out infinite` }}
          />
        ))}
      </div>

      <div className="relative w-full max-w-sm">
        {/* Accent hairline glow along the top edge of the card */}
        <div className="mx-auto h-px w-4/5 bg-gradient-to-r from-transparent via-accent to-transparent" aria-hidden />

        <div className="rounded-brand border border-border bg-surface/70 p-8 shadow-2xl shadow-black/40 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <Image
              src="/brand/mark-color.png"
              alt="Lanky campaign"
              width={40}
              height={40}
              className="h-10 w-10 object-contain"
            />
            <span className="inline-flex items-center gap-2 text-xs text-text-muted">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75 motion-reduce:hidden" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
              </span>
              Portal online
            </span>
          </div>

          <p className="mt-6 text-xs font-medium uppercase tracking-wide text-accent">
            Ibadan NW/SW Federal Constituency
          </p>
          <h1 className="mt-2 font-heading text-2xl text-text">Results Portal</h1>
          <p className="mt-1 text-sm text-text-muted">
            Sign in with your polling unit, ward, LGA, or admin account.
          </p>

          <form action={formAction} className="mt-6 space-y-4">
            <input
              type="email"
              name="email"
              required
              autoFocus
              autoComplete="email"
              onKeyDown={submitOnEnter}
              placeholder="Email"
              className="w-full rounded-brand border border-border bg-bg px-4 py-3 text-sm text-text focus:border-accent focus:outline-none"
            />
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                required
                autoComplete="current-password"
                onKeyDown={submitOnEnter}
                placeholder="Password"
                className="w-full rounded-brand border border-border bg-bg px-4 py-3 pr-11 text-sm text-text focus:border-accent focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-text-muted transition-colors hover:text-text"
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
            <button
              type="submit"
              disabled={isPending}
              className="w-full rounded-brand bg-primary px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
            >
              {isPending ? "Signing in…" : "Sign in"}
            </button>
            {state.error && <p className="text-sm text-primary">{state.error}</p>}
          </form>
        </div>

        <div className="mt-6 flex flex-col items-center gap-3 text-center">
          <ul className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs text-text-muted">
            {TRUST_MARKERS.map((marker, i) => (
              <li key={marker} className="flex items-center gap-2">
                {i > 0 && <span aria-hidden className="text-border">·</span>}
                {marker}
              </li>
            ))}
          </ul>
          <Image
            src="/brand/labour-party-logo.png"
            alt="Labour Party"
            width={72}
            height={24}
            className="h-5 w-auto object-contain opacity-40"
          />
        </div>
      </div>
    </div>
  );
}

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M10.7 5.1A10.5 10.5 0 0 1 12 5c6.5 0 10 7 10 7a17.4 17.4 0 0 1-3.3 4.2M6.6 6.6A17.6 17.6 0 0 0 2 12s3.5 7 10 7a10.4 10.4 0 0 0 5.4-1.5M3 3l18 18M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </svg>
  );
}
