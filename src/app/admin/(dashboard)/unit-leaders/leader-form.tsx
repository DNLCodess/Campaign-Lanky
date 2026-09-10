"use client";

import { useActionState, useEffect, useRef } from "react";
import type { UnitLeader } from "@/lib/unit-leaders";
import {
  createUnitLeader,
  updateUnitLeader,
  type LeaderState,
} from "@/app/admin/(dashboard)/unit-leaders/actions";
import {
  TextField,
  NumberField,
  CheckboxField,
  FormBanner,
  SubmitButton,
} from "@/components/form";

const initial: LeaderState = {};

export function LeaderForm({ leader, onDone }: { leader?: UnitLeader; onDone?: () => void }) {
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
    <form ref={formRef} action={formAction} className="space-y-4">
      {isEdit && <input type="hidden" name="id" value={leader!.id} />}
      {state.error && <FormBanner tone="error">{state.error}</FormBanner>}
      {state.success && !isEdit && <FormBanner tone="info">{state.success}</FormBanner>}

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField name="name" label="Name" defaultValue={leader?.name ?? ""} />
        <TextField
          name="position"
          label="Position"
          helper="e.g. Coordinator"
          defaultValue={leader?.position ?? ""}
        />
        <TextField
          name="unit"
          label="Unit or department"
          helper="e.g. Youth Wing"
          optional
          defaultValue={leader?.unit ?? ""}
        />
        <TextField name="phone" label="Phone" type="tel" optional defaultValue={leader?.phone ?? ""} />
        <TextField name="email" label="Email" type="email" optional defaultValue={leader?.email ?? ""} />
        <NumberField
          name="display_order"
          label="Display order"
          helper="Lower numbers show first."
          optional
          defaultValue={leader?.display_order ?? 0}
        />
      </div>

      <CheckboxField
        name="is_published"
        label="Show on the public team page"
        defaultChecked={leader?.is_published ?? false}
      />

      <div className="flex items-center gap-3">
        <SubmitButton pending={isPending} pendingLabel="Saving…">
          {isEdit ? "Save changes" : "Add leader"}
        </SubmitButton>
        {isEdit && onDone && (
          <button
            type="button"
            onClick={onDone}
            className="rounded-brand border border-border px-4 py-2.5 text-sm text-text-muted transition-colors hover:border-accent hover:text-text"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
