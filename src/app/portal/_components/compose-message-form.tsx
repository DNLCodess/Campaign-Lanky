"use client";

import { useActionState, useState } from "react";
import { sendLeaderMessage, getMessageAudience, type MessageActionState } from "@/app/portal/actions/messaging";
import type { PortalRole } from "@/lib/portal/constants";
import {
  FieldSection,
  SelectField,
  CheckboxField,
  TextField,
  TextareaField,
  FormBanner,
  SubmitButton,
} from "@/components/form";

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
  const [role, setRole] = useState("");
  const [ward, setWard] = useState("");
  const [includeTeamLeaders, setIncludeTeamLeaders] = useState(false);
  const [preview, setPreview] = useState<{ recipients: PreviewRecipient[]; description: string } | null>(null);
  const [previewing, setPreviewing] = useState(false);

  function clearPreview() {
    setPreview(null);
  }

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
    <form action={formAction} className="space-y-8">
      {state.error && <FormBanner tone="error">{state.error}</FormBanner>}

      <FieldSection
        step={1}
        title="Who should get this?"
        description="Everyone in your area gets it unless you narrow it down here."
      >
        {roleOptions.length > 1 && (
          <SelectField
            name="role"
            label="Send to"
            value={role}
            onChange={(v) => {
              setRole(v);
              clearPreview();
            }}
            placeholder="Everyone in your area"
            optional
            options={roleOptions.map((r) => ({ value: r.value, label: r.label }))}
          />
        )}
        {wards && wards.length > 0 && (
          <SelectField
            name="ward"
            label="Ward"
            value={ward}
            onChange={(v) => {
              setWard(v);
              clearPreview();
            }}
            placeholder="All wards"
            optional
            options={wards.map((w) => ({ value: String(w), label: `Ward ${w}` }))}
          />
        )}
        <CheckboxField
          name="include_team_leaders"
          label="Also send to matching Team Leaders"
          helper="Community leaders in the directory who cover the same area."
          checked={includeTeamLeaders}
          onChange={(c) => {
            setIncludeTeamLeaders(c);
            clearPreview();
          }}
        />

        <div>
          <button
            type="button"
            onClick={runPreview}
            disabled={previewing}
            className="rounded-brand border border-border px-4 py-2 text-sm text-text-muted transition-colors hover:border-accent hover:text-text disabled:opacity-60"
          >
            {previewing ? "Checking…" : "See who will get this"}
          </button>

          {preview && (
            <div className="mt-3 rounded-brand border border-border/60 bg-bg/40 p-4 text-sm">
              <p className="text-text">
                {preview.recipients.length} {preview.recipients.length === 1 ? "person" : "people"} —{" "}
                {preview.description}
              </p>
              {noEmailCount > 0 && (
                <p className="mt-1 text-xs text-text-muted">
                  {noEmailCount} have no email on file — you&apos;ll need to reach them by SMS or
                  WhatsApp using the phone numbers below.
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
        </div>
      </FieldSection>

      <FieldSection step={2} title="Your message">
        <TextField name="subject" label="Subject" />
        <TextareaField name="body" label="Message" rows={6} />
      </FieldSection>

      <SubmitButton pending={isPending} pendingLabel="Sending…">
        Send message
      </SubmitButton>

      {state.success && <FormBanner tone="info">{state.success}</FormBanner>}
    </form>
  );
}
