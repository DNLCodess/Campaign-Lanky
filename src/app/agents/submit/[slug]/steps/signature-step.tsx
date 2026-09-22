"use client";

import { SignaturePad } from "@/app/agents/submit/[slug]/signature-pad";

export function SignatureStep({
  signatureDataUrl,
  onSignatureChange,
}: {
  signatureDataUrl: string | null;
  onSignatureChange: (dataUrl: string | null) => void;
}) {
  return (
    <div className="space-y-3">
      {signatureDataUrl && (
        <p className="text-xs text-accent">
          You&apos;ve already signed. The box below is blank until you draw again; only redraw if you want to
          change your signature.
        </p>
      )}
      <SignaturePad onChange={onSignatureChange} />
    </div>
  );
}
