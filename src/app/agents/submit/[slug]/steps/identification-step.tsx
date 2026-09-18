"use client";

import { SelectField } from "@/components/form";
import type { NominationDraftFields } from "@/lib/agents/draft-storage";
import { ALLOWED_PVC_TYPES, isValidFile } from "@/lib/agents/validation";
import { MEANS_OF_ID_OPTIONS } from "@/lib/agents/constants";

export function IdentificationStep({
  draft,
  onChange,
  pvcFile,
  onPvcFileChange,
}: {
  draft: NominationDraftFields;
  onChange: (patch: Partial<NominationDraftFields>) => void;
  pvcFile: File | null;
  onPvcFileChange: (file: File | null) => void;
}) {
  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (file && !isValidFile(file, ALLOWED_PVC_TYPES)) {
      onPvcFileChange(null);
      return;
    }
    onPvcFileChange(file);
  }

  return (
    <div className="space-y-4">
      <SelectField
        name="means_of_id"
        label="Means of ID"
        helper="PVC is required by the Notice — only use another ID if you don't yet have your PVC"
        value={draft.meansOfId}
        onChange={(v) => onChange({ meansOfId: v })}
        options={MEANS_OF_ID_OPTIONS}
        placeholder="Select means of ID"
      />
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-text">Copy of your PVC</label>
        <p className="text-xs text-text-muted">
          Clear photo or scan of your Voter&apos;s Card. JPEG, PNG, or PDF, under 5MB.
        </p>
        <input
          type="file"
          accept="image/jpeg,image/png,application/pdf"
          onChange={handleFile}
          className="w-full rounded-brand border border-border bg-bg px-3.5 py-2.5 text-sm text-text file:mr-3 file:rounded-brand file:border-0 file:bg-surface-2 file:px-3 file:py-1.5 file:text-sm file:text-text"
        />
        {pvcFile && <p className="text-xs text-accent">Selected: {pvcFile.name}</p>}
      </div>
    </div>
  );
}
