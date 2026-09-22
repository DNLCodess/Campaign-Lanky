"use client";

import { Suspense, useActionState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { login, type LoginState } from "@/app/admin/actions";
import { TextField, PasswordField, FormBanner, SubmitButton } from "@/components/form";

const initial: LoginState = {};

export default function AdminLoginPage() {
  return (
    <Suspense>
      <AdminLoginForm />
    </Suspense>
  );
}

function AdminLoginForm() {
  const [state, formAction, isPending] = useActionState(login, initial);
  const formRef = useRef<HTMLFormElement>(null);
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  const submit = () => {
    if (!isPending) formRef.current?.requestSubmit();
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm rounded-brand border border-border bg-surface/40 p-8">
        <Image
          src="/brand/logo-white.png"
          alt="Lanky"
          width={120}
          height={32}
          className="h-7 w-auto"
        />
        <h1 className="mt-6 font-heading text-2xl text-text">Campaign Admin</h1>
        <p className="mt-1 text-sm text-text-muted">Sign in with your campaign team account.</p>

        <form ref={formRef} action={formAction} className="mt-6 space-y-4">
          {next && <input type="hidden" name="next" value={next} />}
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
    </div>
  );
}
