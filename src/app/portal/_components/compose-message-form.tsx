"use client";

import { useActionState, useState } from "react";
import { sendLeaderMessage, getMessageAudience, type MessageActionState } from "@/app/portal/actions/messaging";
import type { PortalRole } from "@/lib/portal/constants";

const initial: MessageActionState = {};

type RoleOption = { value: PortalRole; label: string };
type PreviewRecipient = { name: string; email: string | null; phone: string | null; via: string };

export function ComposeMessageForm({
  roleOptions,
  wards,
}: {
  roleOptions: RoleOption[];
  wards?: number[];
}) {
  const [state, formAction, isPending] = useActionState(sendLeaderMessage, initial);
  const [role, setRole] = useState<string>("");
  const [ward, setWard] = useState<string>("");
  const [includeTeamLeaders, setIncludeTeamLeaders] = useState(false);
  const [preview, setPreview] = useState<{ recipients: PreviewRecipient[]; description: string } | null>(null);
  const [previewing, setPreviewing] = useState(false);

  async function runPreview() {
    setPreviewing(true);
    try {
      setPreview(
        await getMessageAudience({
          role: (role || undefined) as PortalRole | undefined,
          ward: ward ? Number(ward) : undefined,
          includeTeamLeaders,
        }),
      );
    } finally {
      setPreviewing(false);
    }
  }

  const noEmailCount = preview?.recipients.filter((r) => !r.email).length ?? 0;

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {roleOptions.length > 1 && (
          <label className="block">
            <span className="text-sm font-medium text-text">Send to</span>
            <select
              name="role"
              value={role}
              onChange={(e) => {
                setRole(e.target.value);
                setPreview(null);
              }}
              className="mt-1.5 w-full rounded-brand border border-border bg-bg px-3 py-2 text-sm text-text focus:border-accent focus:outline-none"
            >
              <option value="">All in scope</option>
              {roleOptions.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
        )}
        {wards && wards.length > 0 && (
          <label className="block">
            <span className="text-sm font-medium text-text">Ward (optional)</span>
            <select
              name="ward"
              value={ward}
              onChange={(e) => {
                setWard(e.target.value);
                setPreview(null);
              }}
              className="mt-1.5 w-full rounded-brand border border-border bg-bg px-3 py-2 text-sm text-text focus:border-accent focus:outline-none"
            >
              <option value="">All wards</option>
              {wards.map((w) => (
                <option key={w} value={w}>
                  Ward {w}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="flex items-center gap-2 pt-6 text-sm text-text-muted">
          <input
            type="checkbox"
            name="include_team_leaders"
            checked={includeTeamLeaders}
            onChange={(e) => {
              setIncludeTeamLeaders(e.target.checked);
              setPreview(null);
            }}
            className="h-4 w-4 rounded border-border bg-bg accent-primary"
          />
          Also include matching Team Leaders
        </label>
      </div>

      <label className="block">
        <span className="text-sm font-medium text-text">Subject</span>
        <input
          name="subject"
          required
          className="mt-1.5 w-full rounded-brand border border-border bg-bg px-4 py-2.5 text-sm text-text focus:border-accent focus:outline-none"
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-text">Message</span>
        <textarea
          name="body"
          required
          rows={5}
          className="mt-1.5 w-full rounded-brand border border-border bg-bg px-4 py-2.5 text-sm text-text focus:border-accent focus:outline-none"
        />
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={runPreview}
          disabled={previewing}
          className="rounded-brand border border-border px-4 py-2 text-sm text-text-muted transition-colors hover:border-accent hover:text-text disabled:opacity-60"
        >
          {previewing ? "Loading…" : "Preview audience"}
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-brand bg-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
        >
          {isPending ? "Sending…" : "Send message"}
        </button>
      </div>

      {preview && (
        <div className="rounded-brand border border-border/60 bg-bg/40 p-4 text-sm">
          <p className="text-text">
            {preview.recipients.length} leader{preview.recipients.length === 1 ? "" : "s"} match — {preview.description}
          </p>
          {noEmailCount > 0 && (
            <p className="mt-1 text-xs text-text-muted">
              {noEmailCount} have no email on file and will need a manual SMS/WhatsApp follow-up (phone numbers
              below).
            </p>
          )}
          <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto">
            {preview.recipients.map((r, i) => (
              <li key={i} className="text-text-muted">
                {r.name} — {r.email ?? r.phone ?? "no contact on file"}
              </li>
            ))}
          </ul>
        </div>
      )}

      {state.error && <p className="text-sm text-primary">{state.error}</p>}
      {state.success && <p className="text-sm text-accent">{state.success}</p>}
    </form>
  );
}
