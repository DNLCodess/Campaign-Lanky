"use client";

import { useActionState, useState } from "react";
import {
  grantManualReward,
  searchRewardRecipients,
  type RewardActionState,
  type RewardRecipientMatch,
} from "@/app/portal/actions/rewards";
import {
  FieldSection,
  Field,
  NumberField,
  TextField,
  FormBanner,
  SubmitButton,
} from "@/app/portal/_components/form";

const initial: RewardActionState = {};

export function GrantRewardForm() {
  const [state, formAction, isPending] = useActionState(grantManualReward, initial);
  const [recipient, setRecipient] = useState<RewardRecipientMatch | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<RewardRecipientMatch[]>([]);
  const [searching, setSearching] = useState(false);

  const [handledSuccess, setHandledSuccess] = useState(false);
  if (state.success && !handledSuccess) {
    setHandledSuccess(true);
    setRecipient(null);
    setQuery("");
    setResults([]);
  }
  if (!state.success && handledSuccess) setHandledSuccess(false);

  async function runSearch() {
    setSearching(true);
    try {
      setResults(await searchRewardRecipients(query));
    } finally {
      setSearching(false);
    }
  }

  return (
    <form action={formAction} className="space-y-8">
      <input type="hidden" name="recipient_id" value={recipient?.id ?? ""} />
      <input type="hidden" name="recipient_kind" value={recipient?.kind ?? ""} />

      {state.error && <FormBanner tone="error">{state.error}</FormBanner>}

      <FieldSection step={1} title="Who is the reward for?">
        {recipient ? (
          <div className="flex items-center justify-between gap-3 rounded-brand border border-accent/40 bg-accent/10 px-3.5 py-2.5 text-sm">
            <span className="text-text">
              {recipient.full_name} — {recipient.subtitle}
            </span>
            <button
              type="button"
              onClick={() => setRecipient(null)}
              className="text-xs text-text-muted underline hover:text-text"
            >
              Choose someone else
            </button>
          </div>
        ) : (
          <Field label="Find the person" htmlFor="reward-search" helper="Search by name or email.">
            <div className="flex gap-2">
              <input
                id="reward-search"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (query.trim()) runSearch();
                  }
                }}
                className="flex-1 rounded-brand border border-border bg-bg px-3.5 py-2.5 text-sm text-text placeholder:text-text-muted/60 focus:border-accent focus:outline-none"
              />
              <button
                type="button"
                onClick={runSearch}
                disabled={searching || !query.trim()}
                className="rounded-brand border border-border px-4 py-2 text-sm text-text-muted transition-colors hover:border-accent hover:text-text disabled:opacity-60"
              >
                {searching ? "Searching…" : "Search"}
              </button>
            </div>
            {results.length > 0 && (
              <ul className="mt-2 space-y-1">
                {results.map((r) => (
                  <li key={`${r.kind}-${r.id}`}>
                    <button
                      type="button"
                      onClick={() => {
                        setRecipient(r);
                        setResults([]);
                      }}
                      className="w-full rounded-brand px-3 py-2 text-left text-sm text-text-muted hover:bg-surface-2 hover:text-text"
                    >
                      {r.full_name} — {r.subtitle}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {!searching && query.trim() && results.length === 0 && (
              <p className="mt-2 text-xs text-text-muted">No one found. Try a different spelling.</p>
            )}
          </Field>
        )}
      </FieldSection>

      <FieldSection step={2} title="Reward details">
        <NumberField
          name="amount"
          label="Amount"
          helper="In naira (₦). Leave blank to decide the amount later."
          optional
        />
        <TextField
          name="note"
          label="Reason"
          optional
          helper="A short note — e.g. what this reward is for."
        />
      </FieldSection>

      <SubmitButton pending={isPending} pendingLabel="Recording…" disabled={!recipient}>
        Grant reward
      </SubmitButton>

      {state.success && (
        <FormBanner tone="info">Reward recorded — it&apos;s now pending review.</FormBanner>
      )}
    </form>
  );
}
