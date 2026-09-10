"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import {
  toggleAccountStatus,
  regenerateAccountPassword,
  deletePortalAccount,
  type AccountActionState,
} from "@/app/portal/actions/accounts";
import { portalPath } from "@/lib/portal/routes";

const initial: AccountActionState = {};

const btn =
  "rounded-brand border px-3 py-1.5 text-xs font-medium transition-colors";

export function AccountRowActions({
  accountId,
  isActive,
  canEdit = false,
}: {
  accountId: string;
  isActive: boolean;
  canEdit?: boolean;
}) {
  const [toggleState, toggleAction] = useActionState(toggleAccountStatus, initial);
  const [regenState, regenAction] = useActionState(regenerateAccountPassword, initial);
  const [deleteState, deleteAction] = useActionState(deletePortalAccount, initial);
  const [revealedPassword, setRevealedPassword] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  if (regenState.plainPassword && revealedPassword !== regenState.plainPassword) {
    setRevealedPassword(regenState.plainPassword);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canEdit && (
        <Link
          href={portalPath(`/admin/accounts?edit=${accountId}`)}
          className={`${btn} border-border text-text-muted hover:border-accent hover:text-accent`}
        >
          Edit
        </Link>
      )}

      <form action={toggleAction}>
        <input type="hidden" name="account_id" value={accountId} />
        <input type="hidden" name="activate" value={(!isActive).toString()} />
        <button
          type="submit"
          className={`${btn} ${
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
          className={`${btn} border-border text-text-muted hover:border-accent hover:text-accent`}
        >
          Reset password
        </button>
      </form>

      {canEdit && (
        <form action={deleteAction} onSubmit={() => setConfirmingDelete(false)}>
          <input type="hidden" name="account_id" value={accountId} />
          {confirmingDelete ? (
            <span className="flex items-center gap-1">
              <button type="submit" className={`${btn} border-primary bg-primary/10 text-primary`}>
                Confirm delete
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                className={`${btn} border-border text-text-muted hover:text-text`}
              >
                Keep
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className={`${btn} border-border text-text-muted hover:border-primary hover:text-primary`}
            >
              Delete
            </button>
          )}
        </form>
      )}

      {toggleState.error && <span className="text-xs text-primary">{toggleState.error}</span>}
      {deleteState.error && <span className="text-xs text-primary">{deleteState.error}</span>}
      {revealedPassword && (
        <span className="rounded-brand bg-surface-2 px-2 py-1 text-xs text-text">
          New password: <code className="font-mono">{revealedPassword}</code>
        </span>
      )}
    </div>
  );
}
