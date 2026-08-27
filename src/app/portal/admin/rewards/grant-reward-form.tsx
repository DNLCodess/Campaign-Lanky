"use client";

import { useActionState, useState } from "react";
import {
  grantManualReward,
  searchRewardRecipients,
  type RewardActionState,
  type RewardRecipientMatch,
} from "@/app/portal/actions/rewards";

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
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="recipient_id" value={recipient?.id ?? ""} />
      <input type="hidden" name="recipient_kind" value={recipient?.kind ?? ""} />

      {recipient ? (
        <div className="flex items-center justify-between gap-3 rounded-brand bg-surface-2 px-3 py-2 text-sm">
          <span className="text-text">
            {recipient.full_name} — {recipient.subtitle}
          </span>
          <button
            type="button"
            onClick={() => setRecipient(null)}
            className="text-xs text-text-muted underline hover:text-primary"
          >
            Change
          </button>
        </div>
      ) : (
        <div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Search leader by name or email"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 rounded-brand border border-border bg-bg px-3 py-2 text-sm text-text focus:border-accent focus:outline-none"
            />
            <button
              type="button"
              onClick={runSearch}
              disabled={searching || !query.trim()}
              className="rounded-brand border border-border px-3 py-2 text-xs text-text-muted transition-colors hover:border-accent hover:text-text disabled:opacity-60"
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
                    className="w-full rounded-brand px-3 py-1.5 text-left text-sm text-text-muted hover:bg-surface-2 hover:text-text"
                  >
                    {r.full_name} — {r.subtitle}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <input
          name="amount"
          type="number"
          min="0"
          step="1"
          placeholder="Amount (₦, optional)"
          className="w-40 rounded-brand border border-border bg-bg px-3 py-2 text-sm text-text focus:border-accent focus:outline-none"
        />
        <input
          name="note"
          placeholder="Reason (optional)"
          className="min-w-48 flex-1 rounded-brand border border-border bg-bg px-3 py-2 text-sm text-text focus:border-accent focus:outline-none"
        />
        <button
          type="submit"
          disabled={isPending || !recipient}
          className="rounded-brand bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
        >
          {isPending ? "Granting…" : "Grant reward"}
        </button>
      </div>
      {state.error && <p className="text-sm text-primary">{state.error}</p>}
      {state.success && <p className="text-sm text-accent">Reward granted — pending review.</p>}
    </form>
  );
}
