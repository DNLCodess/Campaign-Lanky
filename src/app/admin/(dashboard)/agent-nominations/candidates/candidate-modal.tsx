"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/** Native <dialog> wrapper: focus trap, Esc to close, backdrop click to close. */
export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-brand border border-border bg-bg p-0 text-text shadow-xl backdrop:bg-black/50"
    >
      {open && (
        <div className="max-h-[85vh] overflow-y-auto p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <h2 className="font-heading text-lg text-text">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="-mr-2 -mt-1 rounded-brand px-2 py-1 text-xl leading-none text-text-muted hover:text-text"
            >
              ×
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}

/** Copies text and flips its label to a confirmation for two seconds. */
export function CopyButton({
  text,
  label,
  copiedLabel = "Copied",
  variant = "outline",
}: {
  text: string;
  label: string;
  copiedLabel?: string;
  variant?: "outline" | "solid";
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this link:", text);
    }
  }

  const styles =
    variant === "solid"
      ? "bg-primary text-white hover:bg-primary-hover"
      : "border border-border text-text hover:border-accent";

  return (
    <button
      type="button"
      onClick={copy}
      aria-live="polite"
      className={`whitespace-nowrap rounded-brand px-3.5 py-2 text-sm font-medium transition-colors ${styles} ${
        copied ? "!border-accent !bg-accent/10 !text-accent" : ""
      }`}
    >
      {copied ? `✓ ${copiedLabel}` : label}
    </button>
  );
}
