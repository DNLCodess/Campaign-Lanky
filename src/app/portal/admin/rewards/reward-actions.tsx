"use client";

import { useActionState, useState } from "react";
import { approveReward, markRewardSent, type RewardActionState } from "@/app/portal/actions/rewards";

const initial: RewardActionState = {};

export function ApproveRewardForm({ rewardId }: { rewardId: string }) {
  const [state, formAction, isPending] = useActionState(approveReward, initial);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-brand border border-accent/50 px-3 py-1.5 text-xs text-accent transition-colors hover:bg-accent/10"
      >
        Approve
      </button>
    );
  }

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="reward_id" value={rewardId} />
      <input
        name="amount"
        type="number"
        min="0"
        step="1"
        placeholder="Amount (₦)"
        className="w-28 rounded-brand border border-border bg-bg px-2 py-1.5 text-xs text-text focus:border-accent focus:outline-none"
      />
      <input
        name="note"
        placeholder="Note (optional)"
        className="w-36 rounded-brand border border-border bg-bg px-2 py-1.5 text-xs text-text focus:border-accent focus:outline-none"
      />
      <button
        type="submit"
        disabled={isPending}
        className="rounded-brand bg-accent px-3 py-1.5 text-xs font-medium text-bg transition-colors hover:bg-accent-hover disabled:opacity-60"
      >
        {isPending ? "Saving…" : "Confirm approve"}
      </button>
      {state.error && <span className="text-xs text-primary">{state.error}</span>}
    </form>
  );
}

export function MarkSentButton({ rewardId }: { rewardId: string }) {
  const [state, formAction, isPending] = useActionState(markRewardSent, initial);
  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="reward_id" value={rewardId} />
      <button
        type="submit"
        disabled={isPending}
        className="rounded-brand bg-primary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
      >
        {isPending ? "Marking…" : "Mark sent"}
      </button>
      {state.error && <span className="text-xs text-primary">{state.error}</span>}
    </form>
  );
}
