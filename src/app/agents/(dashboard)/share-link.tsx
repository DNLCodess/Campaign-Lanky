"use client";

import { useSyncExternalStore, useState } from "react";
import { agentsPath } from "@/lib/agents/routes";

/**
 * Lets a candidate hand their agents' submission link over without typing it:
 * one tap to copy, or share straight to WhatsApp / the device share sheet.
 * The origin comes from the browser, so it is agents.votelanky.com in
 * production and the local host in dev.
 */
export function ShareLink({ slug, name }: { slug: string; name: string }) {
  const [copied, setCopied] = useState(false);
  // Browser-only values: empty on the server, real on the client, without an effect.
  const origin = useSyncExternalStore(
    () => () => {},
    () => window.location.origin,
    () => "",
  );
  const canShare = useSyncExternalStore(
    () => () => {},
    () => typeof navigator.share === "function",
    () => false,
  );
  const link = origin ? `${origin}${agentsPath(`/submit/${slug}`)}` : "";

  const message = `Please submit your Polling Unit Agent nomination details for ${name} here: ${link}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this link:", link);
    }
  }

  const btn =
    "rounded-brand border border-border px-3.5 py-2 text-sm font-medium text-text transition-colors hover:border-accent";

  return (
    <section id="share-link" className="mb-6 scroll-mt-20 rounded-brand border border-accent/40 bg-accent/5 p-4">
      <h2 className="font-heading text-base text-text">Your agents’ link</h2>
      <p className="mt-1 text-sm text-text-muted">
        Send this link to your Polling Unit Agents. They open it and fill in their details, and
        each submission appears below.
      </p>
      <p className="mt-3 break-all rounded-brand border border-border bg-bg px-3 py-2 font-mono text-xs text-text">
        {link || " "}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={copy}
          disabled={!link}
          aria-live="polite"
          className={`rounded-brand px-3.5 py-2 text-sm font-medium text-white transition-colors ${
            copied ? "bg-accent" : "bg-primary hover:bg-primary-hover"
          } disabled:opacity-60`}
        >
          {copied ? "✓ Link copied" : "Copy link"}
        </button>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(message)}`}
          target="_blank"
          rel="noopener noreferrer"
          className={btn}
        >
          Share on WhatsApp
        </a>
        {canShare && (
          <button
            type="button"
            onClick={() => navigator.share({ title: "Party Agent nomination", text: message, url: link }).catch(() => {})}
            className={btn}
          >
            Share…
          </button>
        )}
      </div>
    </section>
  );
}
