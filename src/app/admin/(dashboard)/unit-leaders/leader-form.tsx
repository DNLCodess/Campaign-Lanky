"use client";

import { useActionState, useEffect, useRef } from "react";
import type { UnitLeader } from "@/lib/unit-leaders";
import {
  createUnitLeader,
  updateUnitLeader,
  type LeaderState,
} from "@/app/admin/(dashboard)/unit-leaders/actions";

const initial: LeaderState = {};

const field =
  "mt-1.5 w-full rounded-brand border border-border bg-bg px-4 py-2.5 text-sm text-text placeholder:text-text-muted/50 focus:border-accent focus:outline-none";

export function LeaderForm({
  leader,
  onDone,
}: {
  leader?: UnitLeader;
  onDone?: () => void;
}) {
  const isEdit = Boolean(leader);
  const [state, formAction, isPending] = useActionState(
    isEdit ? updateUnitLeader : createUnitLeader,
    initial,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state.success) return;
    if (isEdit) onDone?.();
    else formRef.current?.reset();
  }, [state.success, isEdit, onDone]);

  return (
    <form ref={formRef} action={formAction} className="grid gap-3 sm:grid-cols-2">
      {isEdit && <input type="hidden" name="id" value={leader!.id} />}
      <label className="block">
        <span className="text-sm font-medium text-text">Name</span>
        <input type="text" name="name" required defaultValue={leader?.name ?? ""} className={field} />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-text">Position</span>
        <input
          type="text"
          name="position"
          required
          placeholder="e.g. Coordinator"
          defaultValue={leader?.position ?? ""}
          className={field}
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-text">Unit / Department</span>
        <input
          type="text"
          name="unit"
          placeholder="e.g. Youth Wing"
          defaultValue={leader?.unit ?? ""}
          className={field}
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-text">Phone</span>
        <input type="tel" name="phone" defaultValue={leader?.phone ?? ""} className={field} />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-text">Email</span>
        <input type="email" name="email" defaultValue={leader?.email ?? ""} className={field} />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-text">Display order</span>
        <input
          type="number"
          name="display_order"
          defaultValue={leader?.display_order ?? 0}
          className={field}
        />
      </label>
      <label className="flex items-center gap-2 sm:col-span-2">
        <input
          type="checkbox"
          name="is_published"
          defaultChecked={leader?.is_published ?? false}
          className="h-4 w-4 rounded border-border bg-bg accent-primary"
        />
        <span className="text-sm text-text-muted">Show on public team page (when available)</span>
      </label>

      <div className="flex items-center gap-3 sm:col-span-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-brand bg-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
        >
          {isPending ? "Saving…" : isEdit ? "Save changes" : "Add leader"}
        </button>
        {isEdit && onDone && (
          <button
            type="button"
            onClick={onDone}
            className="rounded-brand border border-border px-4 py-2.5 text-sm text-text-muted transition-colors hover:border-accent hover:text-text"
          >
            Cancel
          </button>
        )}
        {state.error && <p className="text-sm text-primary">{state.error}</p>}
        {state.success && !isEdit && <p className="text-sm text-accent">{state.success}</p>}
      </div>
    </form>
  );
}
