"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { submitNomination, type SubmitNominationState } from "@/app/agents/actions/submit";
import { loadDraft, saveDraft, clearDraft, type NominationDraftFields } from "@/lib/agents/draft-storage";
import { isValidEmail, isValidPhone } from "@/lib/agents/validation";
import type { GeoRow } from "@/lib/portal/geo";
import { BioStep } from "@/app/agents/submit/[slug]/steps/bio-step";
import { ContactStep } from "@/app/agents/submit/[slug]/steps/contact-step";
import { IdentificationStep } from "@/app/agents/submit/[slug]/steps/identification-step";
import { LocationStep } from "@/app/agents/submit/[slug]/steps/location-step";
import { SignatureStep } from "@/app/agents/submit/[slug]/steps/signature-step";
import { PreviewStep } from "@/app/agents/submit/[slug]/steps/preview-step";
import { PhotoUpload } from "@/app/agents/submit/[slug]/photo-upload";
import { Confirmation } from "@/app/agents/submit/[slug]/confirmation";

const STEPS = ["bio", "contact", "identification", "photo", "location", "signature", "preview"] as const;
type Step = (typeof STEPS)[number];

const EMPTY_DRAFT: NominationDraftFields = {
  firstName: "",
  otherNames: "",
  surname: "",
  gender: "",
  phone: "",
  email: "",
  meansOfId: "PVC",
  lga: "",
  ward: "",
  pollingUnitCode: "",
  pollingUnitName: "",
  attested: false,
};

const initialActionState: SubmitNominationState = {};

export function NominationWizard({
  slug,
  candidateOffice,
  electionTypeLabel,
  geo,
}: {
  slug: string;
  candidateOffice: string;
  electionTypeLabel: string;
  geo: GeoRow[];
}) {
  const [draft, setDraft] = useState<NominationDraftFields>(EMPTY_DRAFT);
  const [stepIndex, setStepIndex] = useState(0);
  const [pvcFile, setPvcFile] = useState<File | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [stepError, setStepError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [honeypot, setHoneypot] = useState("");

  useEffect(() => {
    // Deliberately deferred to an effect rather than a lazy useState
    // initializer: this component server-renders too (no window during SSR),
    // so reading localStorage before mount would mismatch the hydrated HTML.
    const saved = loadDraft(slug);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved) setDraft(saved);
    setHydrated(true);
  }, [slug]);

  useEffect(() => {
    if (hydrated) saveDraft(slug, draft);
  }, [slug, draft, hydrated]);

  const [actionState, formAction, isActionPending] = useActionState(submitNomination, initialActionState);
  const [isSubmitting, startTransition] = useTransition();

  useEffect(() => {
    if (actionState.referenceId) clearDraft(slug);
  }, [actionState.referenceId, slug]);

  if (actionState.referenceId) {
    return <Confirmation candidateOffice={candidateOffice} />;
  }

  const step: Step = STEPS[stepIndex];

  function update(patch: Partial<NominationDraftFields>) {
    setDraft((d) => ({ ...d, ...patch }));
  }

  function validateStep(): string | null {
    if (step === "bio") {
      if (!draft.firstName.trim() || !draft.surname.trim()) return "First name and surname are required.";
      if (!draft.gender) return "Select a gender.";
    }
    if (step === "contact") {
      if (!isValidPhone(draft.phone)) return "Enter a valid Nigerian phone number.";
      if (!isValidEmail(draft.email)) return "Enter a valid email address.";
    }
    if (step === "identification") {
      if (!draft.meansOfId.trim()) return "Means of ID is required.";
      if (!pvcFile) return "Upload a copy of your PVC.";
    }
    if (step === "photo") {
      if (!photoFile) return "Upload a passport photograph.";
    }
    if (step === "location") {
      if (!draft.lga || !draft.ward || !draft.pollingUnitCode) return "Select your LGA, ward, and polling unit.";
    }
    if (step === "signature") {
      if (!signatureDataUrl) return "Provide your signature.";
    }
    return null;
  }

  function goNext() {
    const error = validateStep();
    if (error) {
      setStepError(error);
      return;
    }
    setStepError(null);
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  }

  function goBack() {
    setStepError(null);
    setStepIndex((i) => Math.max(i - 1, 0));
  }

  async function handleSubmit() {
    if (!draft.attested) {
      setStepError("You must confirm the attestation to submit.");
      return;
    }
    if (!pvcFile || !photoFile || !signatureDataUrl) {
      setStepError("Something is missing. Please go back and check every step.");
      return;
    }
    const signatureBlob = await (await fetch(signatureDataUrl)).blob();

    const formData = new FormData();
    formData.set("slug", slug);
    formData.set("website", honeypot); // honeypot — bound to the hidden input below
    formData.set("first_name", draft.firstName.trim());
    formData.set("other_names", draft.otherNames.trim());
    formData.set("surname", draft.surname.trim());
    formData.set("gender", draft.gender);
    formData.set("phone", draft.phone.trim());
    formData.set("email", draft.email.trim());
    formData.set("means_of_id", draft.meansOfId.trim());
    formData.set("lga", draft.lga);
    formData.set("ward", draft.ward);
    formData.set("polling_unit_code", draft.pollingUnitCode);
    formData.set("polling_unit_name", draft.pollingUnitName);
    formData.set("attested", "true");
    formData.set("pvc_file", pvcFile);
    formData.set("photo_file", photoFile);
    formData.set("signature_file", signatureBlob, "signature.png");

    startTransition(() => {
      formAction(formData);
    });
  }

  const isPending = isActionPending || isSubmitting;

  return (
    <div className="mx-auto max-w-lg px-5 py-10">
      <p className="text-xs font-medium uppercase tracking-wide text-accent">
        {electionTypeLabel} for {candidateOffice}
      </p>
      <h1 className="mt-2 font-heading text-2xl text-text">Party Agent Nomination</h1>
      <p className="mt-1 text-sm text-text-muted">
        Step {stepIndex + 1} of {STEPS.length}
      </p>

      {/* Honeypot: real users never see this (off-screen, not display:none —
          some bots skip display:none fields). A filled value trips the
          server-side check in submitNomination. */}
      <div style={{ position: "absolute", left: "-9999px", top: "-9999px" }} aria-hidden>
        <label htmlFor="website">Leave this field blank</label>
        <input
          id="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
        />
      </div>

      {actionState.error && (
        <p className="mt-4 rounded-brand border border-primary/40 bg-primary/10 p-3.5 text-sm text-text">
          {actionState.error}
        </p>
      )}
      {stepError && (
        <p className="mt-4 rounded-brand border border-primary/40 bg-primary/10 p-3.5 text-sm text-text">
          {stepError}
        </p>
      )}

      <div className="mt-6">
        {step === "bio" && <BioStep draft={draft} onChange={update} />}
        {step === "contact" && <ContactStep draft={draft} onChange={update} />}
        {step === "identification" && (
          <IdentificationStep draft={draft} onChange={update} pvcFile={pvcFile} onPvcFileChange={setPvcFile} />
        )}
        {step === "photo" && <PhotoUpload photoFile={photoFile} onPhotoFileChange={setPhotoFile} />}
        {step === "location" && <LocationStep draft={draft} onChange={update} geo={geo} />}
        {step === "signature" && (
          <SignatureStep signatureDataUrl={signatureDataUrl} onSignatureChange={setSignatureDataUrl} />
        )}
        {step === "preview" && (
          <PreviewStep
            draft={draft}
            photoFile={photoFile}
            signatureDataUrl={signatureDataUrl}
            electionTypeLabel={electionTypeLabel}
            onAttestedChange={(v) => update({ attested: v })}
          />
        )}
      </div>

      <div className="mt-8 flex justify-between gap-3">
        {stepIndex > 0 ? (
          <button
            type="button"
            onClick={goBack}
            className="rounded-brand border border-border px-4 py-2.5 text-sm text-text-muted transition-colors hover:border-accent hover:text-text"
          >
            Back
          </button>
        ) : (
          <span />
        )}
        {step === "preview" ? (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
            className="rounded-brand bg-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
          >
            {isPending ? "Submitting…" : "Confirm & Submit"}
          </button>
        ) : (
          <button
            type="button"
            onClick={goNext}
            className="rounded-brand bg-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
}
