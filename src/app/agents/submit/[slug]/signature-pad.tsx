"use client";

import { useRef } from "react";
import SignatureCanvas from "react-signature-canvas";

export function SignaturePad({ onChange }: { onChange: (dataUrl: string | null) => void }) {
  const ref = useRef<SignatureCanvas>(null);

  function handleEnd() {
    const canvas = ref.current;
    if (!canvas || canvas.isEmpty()) {
      onChange(null);
      return;
    }
    onChange(canvas.getTrimmedCanvas().toDataURL("image/png"));
  }

  function clear() {
    ref.current?.clear();
    onChange(null);
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-text">Signature</label>
      <p className="text-xs text-text-muted">Sign with your finger or mouse in the box below.</p>
      <div className="rounded-brand border border-border bg-white">
        <SignatureCanvas
          ref={ref}
          penColor="black"
          canvasProps={{ className: "h-40 w-full touch-none" }}
          onEnd={handleEnd}
        />
      </div>
      <button
        type="button"
        onClick={clear}
        className="rounded-brand border border-border px-3 py-1.5 text-xs text-text-muted transition-colors hover:border-accent hover:text-text"
      >
        Clear
      </button>
    </div>
  );
}
