"use client";

import { useActionState, useState } from "react";
import {
  toggleAccountStatus,
  regenerateAccountPassword,
  type AccountActionState,
} from "@/app/portal/actions/accounts";

const initial: AccountActionState = {};

export function AccountRowActions({ accountId, isActive }: { accountId: string; isActive: boolean }) {
  const [toggleState, toggleAction] = useActionState(toggleAccountStatus, initial);
  const [regenState, regenAction] = useActionState(regenerateAccountPassword, initial);
  const [revealedPassword, setRevealedPassword] = useState<string | null>(null);

  if (regenState.plainPassword && revealedPassword !== regenState.plainPassword) {
    setRevealedPassword(regenState.plainPassword);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <form action={toggleAction}>
        <input type="hidden" name="account_id" value={accountId} />
        <input type="hidden" name="activate" value={(!isActive).toString()} />
        <button
          type="submit"
          className={`rounded-brand border px-3 py-1.5 text-xs font-medium transition-colors ${
            isActive
              ? "border-border text-text-muted hover:border-primary hover:text-primary"
              : "border-accent/50 text-accent hover:bg-accent/10"
          }`}
        >
          {isActive ? "Deactivate" : "Activate"}
        </button>
      </form>
      <form action={regenAction}>
        <input type="hidden" name="account_id" value={accountId} />
        <button
          type="submit"
          className="rounded-brand border border-border px-3 py-1.5 text-xs text-text-muted transition-colors hover:border-accent hover:text-accent"
        >
          Reset password
        </button>
      </form>
      {toggleState.error && <span className="text-xs text-primary">{toggleState.error}</span>}
      {revealedPassword && (
        <span className="rounded-brand bg-surface-2 px-2 py-1 text-xs text-text">
          New password: <code className="font-mono">{revealedPassword}</code>
        </span>
      )}
    </div>
  );
}
