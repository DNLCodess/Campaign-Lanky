"use client";

import { useEffect, useState } from "react";
import { CheckboxField } from "@/components/form";
import type { NominationDraftFields } from "@/lib/agents/draft-storage";
import { CONSTITUENCY_STATE } from "@/lib/agents/constants";

export function PreviewStep({
  draft,
  photoFile,
  signatureDataUrl,
  electionTypeLabel,
  onAttestedChange,
}: {
  draft: NominationDraftFields;
  photoFile: File | null;
  signatureDataUrl: string | null;
  electionTypeLabel: string;
  onAttestedChange: (attested: boolean) => void;
}) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    // Genuine external-system sync (Blob URL lifecycle), not derivable state
    // — createObjectURL/revokeObjectURL must pair inside an effect.
    if (!photoFile) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPhotoUrl(null);
      return;
    }
    const url = URL.createObjectURL(photoFile);
    setPhotoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [photoFile]);

  const fullName = [draft.firstName, draft.otherNames, draft.surname].filter(Boolean).join(" ");

  return (
    <div className="space-y-5">
      <div className="rounded-brand border border-border bg-surface/40 p-4 text-sm">
        <p className="font-medium text-text">{electionTypeLabel} — Polling Unit Agent</p>
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-text-muted">
          <dt>Name</dt>
          <dd className="text-text">{fullName}</dd>
          <dt>Gender</dt>
          <dd className="text-text capitalize">{draft.gender}</dd>
          <dt>Phone</dt>
          <dd className="text-text">{draft.phone}</dd>
          <dt>Email</dt>
          <dd className="text-text">{draft.email || "—"}</dd>
          <dt>Means of ID</dt>
          <dd className="text-text">{draft.meansOfId}</dd>
          <dt>State</dt>
          <dd className="text-text">{CONSTITUENCY_STATE}</dd>
          <dt>LGA</dt>
          <dd className="text-text">{draft.lga}</dd>
          <dt>Ward</dt>
          <dd className="text-text">{draft.ward}</dd>
          <dt>Polling Unit</dt>
          <dd className="text-text">
            {draft.pollingUnitCode} — {draft.pollingUnitName}
          </dd>
        </dl>
        <div className="mt-4 flex gap-4">
          {photoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoUrl} alt="Passport photo" className="h-28 w-24 rounded border border-border object-cover" />
          )}
          {signatureDataUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={signatureDataUrl}
              alt="Signature"
              className="h-20 w-40 rounded border border-border bg-white object-contain"
            />
          )}
        </div>
      </div>

      <CheckboxField
        name="attested"
        label="I hereby attest that the information provided on this form is true, complete and accurate to the best of my knowledge and belief and the supporting information belong to me and have been supplied voluntarily for the purpose for which this form is intended."
        checked={draft.attested}
        onChange={onAttestedChange}
      />
    </div>
  );
}
