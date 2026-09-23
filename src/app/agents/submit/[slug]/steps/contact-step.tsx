"use client";

import { TextField } from "@/components/form";
import type { NominationDraftFields } from "@/lib/agents/draft-storage";
import { MAX_EMAIL_LENGTH } from "@/lib/agents/validation";

export function ContactStep({
  draft,
  onChange,
}: {
  draft: NominationDraftFields;
  onChange: (patch: Partial<NominationDraftFields>) => void;
}) {
  return (
    <div className="space-y-4">
      <TextField
        name="phone"
        label="Phone Number"
        type="tel"
        inputMode="tel"
        autoFocus
        helper="e.g. 08012345678"
        value={draft.phone}
        onChange={(v) => onChange({ phone: v })}
      />
      <TextField
        name="email"
        label="Email Address"
        type="email"
        optional
        value={draft.email}
        onChange={(v) => onChange({ email: v })}
        maxLength={MAX_EMAIL_LENGTH}
      />
    </div>
  );
}
