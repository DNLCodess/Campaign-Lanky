"use client";

export type NominationDraftFields = {
  firstName: string;
  otherNames: string;
  surname: string;
  gender: "male" | "female" | "";
  phone: string;
  email: string;
  meansOfId: string;
  lga: string;
  ward: string;
  pollingUnitCode: string;
  pollingUnitName: string;
  attested: boolean;
};

const DRAFT_VERSION = "v1";

function draftKey(slug: string): string {
  return `agent-nomination-draft:${DRAFT_VERSION}:${slug}`;
}

/** Reads a saved draft for this authority's link, or null if there isn't one / it can't be read. */
export function loadDraft(slug: string): NominationDraftFields | null {
  try {
    const raw = window.localStorage.getItem(draftKey(slug));
    if (!raw) return null;
    return JSON.parse(raw) as NominationDraftFields;
  } catch {
    return null;
  }
}

/** Saves the current draft. Swallows storage errors (private browsing, quota, etc) — losing autosave is not fatal. */
export function saveDraft(slug: string, draft: NominationDraftFields): void {
  try {
    window.localStorage.setItem(draftKey(slug), JSON.stringify(draft));
  } catch {
    // best-effort only
  }
}

/** Clears the draft once a submission succeeds. */
export function clearDraft(slug: string): void {
  try {
    window.localStorage.removeItem(draftKey(slug));
  } catch {
    // no-op
  }
}
