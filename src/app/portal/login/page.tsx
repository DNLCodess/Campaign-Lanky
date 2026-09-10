"use client";

import { useActionState, useRef } from "react";
import Image from "next/image";
import { loginPortal, type PortalActionState } from "@/app/portal/actions/auth";
import { TextField, PasswordField, FormBanner, SubmitButton } from "@/components/form";

const initial: PortalActionState = {};

const TRUST_MARKERS = ["Agent-verified", "Result-sheet backed", "Checksummed"];

export default function PortalLoginPage() {
  const [state, formAction, isPending] = useActionState(loginPortal, initial);
  const formRef = useRef<HTMLFormElement>(null);
  const submit = () => {
    if (!isPending) formRef.current?.requestSubmit();
  };

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
            Sign in with the account your coordinator gave you.
          </p>

          <form ref={formRef} action={formAction} className="mt-6 space-y-4">
            {state.error && <FormBanner tone="error">{state.error}</FormBanner>}
            <TextField
              name="email"
              label="Email address"
              type="email"
              autoComplete="email"
              autoFocus
              onEnter={submit}
            />
            <PasswordField
              name="password"
              label="Password"
              autoComplete="current-password"
              onEnter={submit}
            />
            <SubmitButton pending={isPending} pendingLabel="Signing in…" fullWidth>
              Sign in
            </SubmitButton>
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
