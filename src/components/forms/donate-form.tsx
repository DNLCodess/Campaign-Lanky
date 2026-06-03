"use client";

import { useActionState, useEffect, useState } from "react";
import { initiateDonation, type DonateState } from "@/app/donate/actions";

const initial: DonateState = { status: "idle" };
const presets = [2000, 5000, 10000, 25000, 50000, 100000];
const naira = (n: number) => `₦${n.toLocaleString("en-NG")}`;

export function DonateForm() {
  const [state, formAction, isPending] = useActionState(initiateDonation, initial);
  const [amount, setAmount] = useState<number | "">(5000);
  const [custom, setCustom] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  // On success the action returns a hosted-checkout link → go to it.
  useEffect(() => {
    if (state.link) {
      setRedirecting(true);
      window.location.assign(state.link);
    }
  }, [state.link]);

  const busy = isPending || redirecting;

  return (
    <form action={formAction} className="space-y-6">
      {/* Amount */}
      <div>
        <span className="text-sm font-medium text-text">Choose an amount</span>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {presets.map((p) => {
            const selected = !custom && amount === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => {
                  setCustom(false);
                  setAmount(p);
                }}
                className={`rounded-brand border px-4 py-3.5 font-medium transition-colors ${
                  selected
                    ? "border-primary bg-primary/10 text-text"
                    : "border-border bg-bg text-text hover:border-accent"
                }`}
              >
                {naira(p)}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => {
              setCustom(true);
              setAmount("");
            }}
            className={`rounded-brand border px-4 py-3.5 font-medium transition-colors ${
              custom
                ? "border-primary bg-primary/10 text-text"
                : "border-dashed border-border bg-bg text-text-muted hover:border-accent hover:text-accent"
            }`}
          >
            Custom
          </button>
        </div>

        {custom && (
          <div className="mt-3">
            <div className="flex items-center rounded-brand border border-border bg-bg px-4 focus-within:border-accent">
              <span className="text-text-muted">₦</span>
              <input
                type="number"
                inputMode="numeric"
                min={100}
                step={100}
                autoFocus
                value={amount}
                onChange={(e) =>
                  setAmount(e.target.value === "" ? "" : Number(e.target.value))
                }
                placeholder="Enter amount"
                className="w-full bg-transparent px-2 py-3 text-sm text-text focus:outline-none"
              />
            </div>
          </div>
        )}
        {/* Submitted amount */}
        <input type="hidden" name="amount" value={amount === "" ? "" : amount} />
      </div>

      {/* Donor details */}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-text">Full name</span>
          <input
            type="text"
            name="name"
            required
            className="mt-2 w-full rounded-brand border border-border bg-bg px-4 py-3 text-sm text-text focus:border-accent focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-text">Email</span>
          <input
            type="email"
            name="email"
            required
            className="mt-2 w-full rounded-brand border border-border bg-bg px-4 py-3 text-sm text-text focus:border-accent focus:outline-none"
          />
        </label>
      </div>
      <label className="block">
        <span className="text-sm font-medium text-text">Phone (optional)</span>
        <input
          type="tel"
          name="phone"
          className="mt-2 w-full rounded-brand border border-border bg-bg px-4 py-3 text-sm text-text focus:border-accent focus:outline-none"
        />
      </label>

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-brand bg-primary px-6 py-4 text-lg font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
      >
        {busy
          ? "Redirecting to secure checkout…"
          : amount && amount >= 100
            ? `Donate ${naira(Number(amount))}`
            : "Donate"}
      </button>

      {state.status === "error" && state.message && (
        <p className="text-center text-sm text-primary">{state.message}</p>
      )}

      <div className="flex items-center justify-center gap-2 text-xs text-text-muted">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
          <path
            d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
        Secured by Flutterwave · card, bank transfer &amp; USSD
      </div>
    </form>
  );
}
