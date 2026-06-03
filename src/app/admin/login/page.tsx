"use client";

import { useActionState } from "react";
import Image from "next/image";
import { login, type LoginState } from "@/app/admin/actions";

const initial: LoginState = {};

export default function AdminLoginPage() {
  const [state, formAction, isPending] = useActionState(login, initial);

  return (
    <div className="flex min-h-screen items-center justify-center px-5">
      <div className="w-full max-w-sm rounded-brand border border-border bg-surface/40 p-8">
        <Image
          src="/brand/logo-white.png"
          alt="Lanky"
          width={120}
          height={32}
          className="h-7 w-auto"
        />
        <h1 className="mt-6 font-heading text-2xl text-text">Campaign Admin</h1>
        <p className="mt-1 text-sm text-text-muted">
          Sign in with your campaign team account.
        </p>

        <form action={formAction} className="mt-6 space-y-4">
          <input
            type="email"
            name="email"
            required
            autoFocus
            autoComplete="email"
            placeholder="Email"
            className="w-full rounded-brand border border-border bg-bg px-4 py-3 text-sm text-text focus:border-accent focus:outline-none"
          />
          <input
            type="password"
            name="password"
            required
            autoComplete="current-password"
            placeholder="Password"
            className="w-full rounded-brand border border-border bg-bg px-4 py-3 text-sm text-text focus:border-accent focus:outline-none"
          />
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
    </div>
  );
}
