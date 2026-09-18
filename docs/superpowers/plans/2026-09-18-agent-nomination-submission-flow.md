# Party Agent Nomination Platform — Nominee Submission Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the public, no-login nominee submission wizard at `/agents/submit/[slug]` — bio/contact/identification/photo/location/signature capture, an HTML live preview, and a server action that validates everything again, generates the real PDF via Foundation's coordinate mapping, uploads every file, and inserts the DB rows.

**Architecture:** A client-side multi-step wizard (single component tree, no page reloads between steps) backed by one `"use server"` action that is the only place writes actually happen. `localStorage` autosave for text fields. `pdf-lib` generation reuses Foundation's `form-template.ts` coordinates and the extracted template PDF. Cascading location dropdowns reuse the portal's existing `constituency_geo` helpers rather than duplicating them.

**Tech Stack:** Next.js 16 (App Router), TypeScript, `pdf-lib`, `react-signature-canvas`, Supabase (Postgres/Storage via service-role client), existing form primitives in `src/components/form`.

**Spec:** `docs/superpowers/specs/2026-09-18-agent-nomination-submission-flow-design.md` (and `docs/superpowers/specs/2026-09-17-agent-nomination-foundation-design.md` for the schema/template this builds on).

## Global Constraints

- Supabase project id for every MCP tool call in this plan: `atavwpoistostnqxmeal`.
- No test framework in this repo. Verification is `npm run lint`, `npm run build`, direct SQL/storage checks, scripted smoke tests that call server actions or generation code directly (the same technique Foundation used), and disclosed manual dev-server testing (no browser automation available).
- Nominee never logs in. `submitNomination` derives the authority from the `slug` in the submitted form data server-side — it never trusts a client-supplied identity, matching this repo's established convention.
- One nominee signature, stamped into both the specimen and attestation boxes at PDF-generation time (Foundation's `attestation_signature` file-type enum value stays valid but unused).
- The live preview is an HTML mirror, not a rendered PDF. The real PDF is generated exactly once, server-side, at final submit.
- `CONSTITUENCY_STATE = "Oyo State"` is a hardcoded constant — there is no `state` column on `agent_nominations`.
- A hidden honeypot field (`website`) guards against basic bots (PRD §8): if non-empty, `submitNomination` returns a generic error with no DB writes and no uploads.
- Follow existing code style: `"use server"` action files return `{ error? }`-shaped state for `useActionState`; service-role client is `createAdminSupabase()`; controlled form primitives (`TextField`, `SelectField`, etc.) come from `@/components/form`.

---

## Task 1: Shared validation, autosave, and constants

**Files:**
- Create: `src/lib/agents/validation.ts`
- Create: `src/lib/agents/draft-storage.ts`
- Modify: `src/lib/agents/constants.ts`

**Interfaces:**
- Produces: `isValidPhone(phone: string): boolean`, `isValidEmail(email: string): boolean`, `isValidFile(file: File, allowedTypes: string[]): boolean`, `ALLOWED_PVC_TYPES: string[]`, `ALLOWED_PHOTO_TYPES: string[]`, `MAX_FILE_SIZE: number` (validation.ts — imported by both the wizard's client-side step gates and `submitNomination`'s server-side real gate, so the rules are defined once); `type NominationDraftFields`, `loadDraft(slug: string): NominationDraftFields | null`, `saveDraft(slug: string, draft: NominationDraftFields): void`, `clearDraft(slug: string): void` (draft-storage.ts); `CONSTITUENCY_STATE: string` (added to constants.ts).

- [ ] **Step 1: Write validation.ts**

```ts
export const PHONE_REGEX = /^(?:\+234|0)\d{10}$/;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_PVC_TYPES = ["image/jpeg", "image/png", "application/pdf"];
export const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png"];

export function isValidPhone(phone: string): boolean {
  return PHONE_REGEX.test(phone.trim());
}

/** Email is optional on the official form — an empty value is valid. */
export function isValidEmail(email: string): boolean {
  const trimmed = email.trim();
  if (!trimmed) return true;
  return EMAIL_REGEX.test(trimmed);
}

export function isValidFile(file: File, allowedTypes: string[]): boolean {
  return file.size > 0 && file.size <= MAX_FILE_SIZE && allowedTypes.includes(file.type);
}
```

- [ ] **Step 2: Write draft-storage.ts**

```ts
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
```

- [ ] **Step 3: Add the state constant**

Read `src/lib/agents/constants.ts` first, then append:

```ts
/** Every nomination authority in this build is Oyo State — there is no state column on agent_nominations. */
export const CONSTITUENCY_STATE = "Oyo State";
```

- [ ] **Step 4: Verify with a build**

Run: `npm run build`
Expected: succeeds. Nothing imports these modules yet, so this only confirms they compile standalone.

- [ ] **Step 5: Commit**

```bash
git add src/lib/agents/validation.ts src/lib/agents/draft-storage.ts src/lib/agents/constants.ts
git commit -m "feat(agents): add shared validation, draft autosave, and state constant"
```

---

## Task 2: PDF generation

**Files:**
- Create: `src/lib/agents/pdf-generate.ts`

**Interfaces:**
- Consumes: `CHECKBOXES`, `TEXT_FIELDS`, `PHOTO_BOX`, `SIGNATURE_BOXES` from `@/lib/agents/pdf-template/form-template` (Foundation); `ElectionType` from `@/lib/agents/constants`.
- Produces: `type GeneratePdfInput`, `generateNominationPdf(input: GeneratePdfInput): Promise<Uint8Array>` — consumed by Task 3's `submitNomination`.

- [ ] **Step 1: Write pdf-generate.ts**

```ts
import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { CHECKBOXES, TEXT_FIELDS, PHOTO_BOX, SIGNATURE_BOXES } from "@/lib/agents/pdf-template/form-template";
import type { ElectionType } from "@/lib/agents/constants";

export type GeneratePdfInput = {
  electionType: ElectionType;
  formNo: number;
  firstName: string;
  otherNames: string;
  surname: string;
  gender: "male" | "female";
  phone: string;
  email: string;
  meansOfId: string;
  state: string;
  lga: string;
  ward: number;
  pollingUnitCode: string;
  pollingUnitName: string;
  photoBytes: Uint8Array;
  signatureBytes: Uint8Array;
  authorityName: string;
  authoritySignatureBytes: Uint8Array;
  submissionDate: Date;
};

const TEMPLATE_PATH = path.join(
  process.cwd(),
  "src/lib/agents/pdf-template/party-agent-nomination-form.pdf",
);

function formatDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

/** Generates the pixel-mapped Party Agent Nomination Form PDF for one submission. */
export async function generateNominationPdf(input: GeneratePdfInput): Promise<Uint8Array> {
  const templateBytes = await readFile(TEMPLATE_PATH);
  const doc = await PDFDocument.load(templateBytes);
  const page = doc.getPages()[0];
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontSize = 10;

  function text(value: string, point: { x: number; y: number }) {
    if (!value) return;
    page.drawText(value, { x: point.x, y: point.y, size: fontSize, font, color: rgb(0, 0, 0) });
  }
  function check(point: { x: number; y: number }) {
    page.drawText("X", { x: point.x + 1, y: point.y, size: fontSize, font, color: rgb(0, 0, 0) });
  }
  async function image(bytes: Uint8Array, box: { x: number; y: number; width: number; height: number }) {
    const isPng = bytes[0] === 0x89;
    const embedded = isPng ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
    const scaled = embedded.scaleToFit(box.width, box.height);
    page.drawImage(embedded, {
      x: box.x + (box.width - scaled.width) / 2,
      y: box.y + (box.height - scaled.height) / 2,
      width: scaled.width,
      height: scaled.height,
    });
  }

  check(CHECKBOXES.electionType[input.electionType]);
  check(CHECKBOXES.agentFor.pollingUnit);
  check(CHECKBOXES.gender[input.gender]);

  text(String(input.formNo), TEXT_FIELDS.formNo);
  text(input.firstName, TEXT_FIELDS.firstName);
  text(input.otherNames, TEXT_FIELDS.otherNames);
  text(input.surname, TEXT_FIELDS.surname);
  text(input.phone, TEXT_FIELDS.phoneNumber);
  text(input.email, TEXT_FIELDS.emailAddress);
  text(input.meansOfId, TEXT_FIELDS.meansOfId);
  text(input.state, TEXT_FIELDS.state);
  text(input.lga, TEXT_FIELDS.lga);
  text(String(input.ward), TEXT_FIELDS.registrationArea);
  text(input.pollingUnitCode, TEXT_FIELDS.pollingUnitCode);
  text(input.pollingUnitName, TEXT_FIELDS.pollingUnitName);

  const fullName = [input.firstName, input.otherNames, input.surname].filter(Boolean).join(" ");
  const dateStr = formatDate(input.submissionDate);
  text(fullName, TEXT_FIELDS.attestationName);
  text(dateStr, TEXT_FIELDS.attestationDate);
  text(input.authorityName, TEXT_FIELDS.authorisedNominatorName);
  text(dateStr, TEXT_FIELDS.authorisedNominatorDate);

  await image(input.photoBytes, PHOTO_BOX);
  await image(input.signatureBytes, SIGNATURE_BOXES.specimen);
  await image(input.signatureBytes, SIGNATURE_BOXES.attestation);
  await image(input.authoritySignatureBytes, SIGNATURE_BOXES.authorisedNominator);

  return doc.save();
}
```

- [ ] **Step 2: Verify with a build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 3: Visually verify a real generated PDF**

Create test image bytes and a scratch verification script (not committed):

```bash
python3 -c "
from PIL import Image
Image.new('RGB', (400, 500), (200, 30, 30)).save('/tmp/agent-pdf-test-photo.jpg')
Image.new('RGBA', (300, 100), (0,0,0,0)).save('/tmp/agent-pdf-test-signature.png')
"
```

Write `/tmp/verify-pdf-generate.mjs`, then copy it into the project root (module resolution needs `node_modules`) and run with `tsx` so the `.ts` import works:

```js
import { readFile, writeFile } from "node:fs/promises";
import { generateNominationPdf } from "./src/lib/agents/pdf-generate.ts";

const photoBytes = new Uint8Array(await readFile("/tmp/agent-pdf-test-photo.jpg"));
const signatureBytes = new Uint8Array(await readFile("/tmp/agent-pdf-test-signature.png"));

const pdfBytes = await generateNominationPdf({
  electionType: "house_of_reps",
  formNo: 42,
  firstName: "Ade",
  otherNames: "Bola",
  surname: "Ogundimu",
  gender: "male",
  phone: "08012345678",
  email: "ade@example.com",
  meansOfId: "PVC",
  state: "Oyo State",
  lga: "Ibadan North-West",
  ward: 3,
  pollingUnitCode: "30-08-03-001",
  pollingUnitName: "Sample Polling Unit",
  photoBytes,
  signatureBytes,
  authorityName: "Hon. Test Candidate",
  authoritySignatureBytes: signatureBytes,
  submissionDate: new Date("2026-09-18"),
});

await writeFile("/tmp/generated-nomination-test.pdf", pdfBytes);
console.log("wrote /tmp/generated-nomination-test.pdf");
```

Run:
```bash
npm install --no-save tsx
npx tsx /tmp/verify-pdf-generate.mjs
pdftoppm -png -r 150 /tmp/generated-nomination-test.pdf /tmp/generated-nomination-test
```

Then view `/tmp/generated-nomination-test-1.png`. Expected: the House of Reps and Polling Unit checkboxes are ticked, "Male" is ticked, all text fields show the test data in the right boxes (reusing the same visual layout Foundation already calibrated), the red test photo appears in the photo box, and the transparent signature PNG appears in both the specimen and attestation signature boxes plus the Authorised Nominator box. If anything is misplaced, the coordinates are Foundation's (`form-template.ts`) — fix there, not here, and re-run this step.

- [ ] **Step 4: Commit**

```bash
git add src/lib/agents/pdf-generate.ts
git commit -m "feat(agents): add server-side PDF generation from submitted data"
```

---

## Task 3: Submission server action

**Files:**
- Create: `src/app/agents/actions/submit.ts`

**Interfaces:**
- Consumes: `generateNominationPdf` (Task 2); `isValidPhone`, `isValidEmail`, `isValidFile`, `ALLOWED_PVC_TYPES`, `ALLOWED_PHOTO_TYPES` (Task 1); `CONSTITUENCY_STATE`, `ElectionType` from `@/lib/agents/constants`; `createAdminSupabase` from `@/lib/supabase/admin`.
- Produces: `type SubmitNominationState = { error?: string; referenceId?: string }`, `submitNomination(prev: SubmitNominationState, formData: FormData): Promise<SubmitNominationState>` — consumed by Task 4's wizard.

- [ ] **Step 1: Write submit.ts**

```ts
"use server";

import { randomInt, randomUUID } from "node:crypto";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { generateNominationPdf } from "@/lib/agents/pdf-generate";
import {
  ALLOWED_PHOTO_TYPES,
  ALLOWED_PVC_TYPES,
  isValidEmail,
  isValidFile,
  isValidPhone,
} from "@/lib/agents/validation";
import { CONSTITUENCY_STATE, type ElectionType } from "@/lib/agents/constants";

export type SubmitNominationState = { error?: string; referenceId?: string };

const REF_ID_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I ambiguity

function generateReferenceId(): string {
  return Array.from({ length: 8 }, () => REF_ID_CHARS[randomInt(REF_ID_CHARS.length)]).join("");
}

const GENERIC_ERROR = "Something went wrong. Please try again.";

export async function submitNomination(
  _prev: SubmitNominationState,
  formData: FormData,
): Promise<SubmitNominationState> {
  // Honeypot: real users never see or fill this field (PRD §8 bot protection).
  if (String(formData.get("website") ?? "").trim()) {
    return { error: GENERIC_ERROR };
  }

  const slug = String(formData.get("slug") ?? "").trim();
  if (!slug) return { error: "Missing link identifier." };

  const admin = createAdminSupabase();
  const { data: authority } = await admin
    .from("nomination_authorities")
    .select("id, full_name, election_type, signature_storage_path, is_active")
    .eq("slug", slug)
    .maybeSingle();
  if (!authority || !authority.is_active) {
    return { error: "This link is no longer active. Contact the person who shared it with you." };
  }
  if (!authority.signature_storage_path) {
    return { error: "This authority has no signature on file yet. Contact them directly." };
  }

  const firstName = String(formData.get("first_name") ?? "").trim();
  const otherNames = String(formData.get("other_names") ?? "").trim();
  const surname = String(formData.get("surname") ?? "").trim();
  const gender = String(formData.get("gender") ?? "");
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const meansOfId = String(formData.get("means_of_id") ?? "").trim() || "PVC";
  const lga = String(formData.get("lga") ?? "").trim();
  const ward = Number(formData.get("ward"));
  const pollingUnitCode = String(formData.get("polling_unit_code") ?? "").trim();
  const pollingUnitName = String(formData.get("polling_unit_name") ?? "").trim();
  const attested = formData.get("attested") === "true";
  const pvcFile = formData.get("pvc_file");
  const photoFile = formData.get("photo_file");
  const signatureFile = formData.get("signature_file");

  if (!firstName || !surname) return { error: "First name and surname are required." };
  if (gender !== "male" && gender !== "female") return { error: "Select a gender." };
  if (!isValidPhone(phone)) return { error: "Enter a valid Nigerian phone number." };
  if (!isValidEmail(email)) return { error: "Enter a valid email address." };
  if (!lga) return { error: "Select an LGA." };
  if (!ward || ward < 1) return { error: "Select a ward." };
  if (!pollingUnitCode || !pollingUnitName) return { error: "Select a polling unit." };
  if (!attested) return { error: "You must confirm the attestation to submit." };
  if (!(pvcFile instanceof File) || !isValidFile(pvcFile, ALLOWED_PVC_TYPES)) {
    return { error: "Upload a valid PVC copy (JPEG, PNG, or PDF, under 5MB)." };
  }
  if (!(photoFile instanceof File) || !isValidFile(photoFile, ALLOWED_PHOTO_TYPES)) {
    return { error: "Upload a valid passport photo (JPEG or PNG, under 5MB)." };
  }
  if (!(signatureFile instanceof File) || signatureFile.size === 0) {
    return { error: "A signature is required." };
  }

  const { data: pu } = await admin
    .from("constituency_geo")
    .select("lga, ward, pu_code, pu_name")
    .eq("pu_code", pollingUnitCode)
    .maybeSingle();
  if (!pu || pu.lga !== lga || pu.ward !== ward || pu.pu_name !== pollingUnitName) {
    return { error: "Selected polling unit does not match the chosen LGA/ward." };
  }

  const { data: existingMatches } = await admin
    .from("agent_nominations")
    .select("id")
    .eq("authority_id", authority.id)
    .or(`phone.eq.${phone}${email ? `,email.eq.${email}` : ""}`);
  const isPossibleDuplicate = (existingMatches?.length ?? 0) > 0;

  const nominationId = randomUUID();
  const [pvcBytes, photoBytes, signatureBytes] = await Promise.all([
    pvcFile.arrayBuffer().then((b) => new Uint8Array(b)),
    photoFile.arrayBuffer().then((b) => new Uint8Array(b)),
    signatureFile.arrayBuffer().then((b) => new Uint8Array(b)),
  ]);

  const pvcExt = pvcFile.type === "application/pdf" ? "pdf" : pvcFile.type === "image/png" ? "png" : "jpg";
  const photoExt = photoFile.type === "image/png" ? "png" : "jpg";
  const pvcPath = `nominations/${nominationId}/pvc.${pvcExt}`;
  const photoPath = `nominations/${nominationId}/photo.${photoExt}`;
  const signaturePath = `nominations/${nominationId}/signature.png`;

  const uploadResults = await Promise.all([
    admin.storage.from("agent-nominations").upload(pvcPath, pvcBytes, { contentType: pvcFile.type, upsert: false }),
    admin.storage.from("agent-nominations").upload(photoPath, photoBytes, { contentType: photoFile.type, upsert: false }),
    admin.storage.from("agent-nominations").upload(signaturePath, signatureBytes, { contentType: "image/png", upsert: false }),
  ]);
  if (uploadResults.some((r) => r.error)) {
    await admin.storage.from("agent-nominations").remove([pvcPath, photoPath, signaturePath]);
    return { error: "Failed to upload your files. Please try again." };
  }

  async function tryInsert(refId: string) {
    return admin
      .from("agent_nominations")
      .insert({
        id: nominationId,
        authority_id: authority.id,
        first_name: firstName,
        other_names: otherNames || null,
        surname,
        gender,
        phone,
        email: email || null,
        means_of_id: meansOfId,
        lga,
        ward,
        polling_unit_code: pollingUnitCode,
        polling_unit_name: pollingUnitName,
        reference_id: refId,
        status: isPossibleDuplicate ? "flagged" : "submitted",
        is_possible_duplicate: isPossibleDuplicate,
      })
      .select("id, form_no")
      .single();
  }

  let referenceId = generateReferenceId();
  let insertResult = await tryInsert(referenceId);
  if (insertResult.error?.code === "23505") {
    referenceId = generateReferenceId();
    insertResult = await tryInsert(referenceId);
  }
  if (insertResult.error || !insertResult.data) {
    await admin.storage.from("agent-nominations").remove([pvcPath, photoPath, signaturePath]);
    return { error: "Failed to save your submission. Please try again." };
  }
  const insertedId = insertResult.data.id;
  const formNo = insertResult.data.form_no;

  let pdfBytes: Uint8Array;
  try {
    pdfBytes = await generateNominationPdf({
      electionType: authority.election_type as ElectionType,
      formNo,
      firstName,
      otherNames,
      surname,
      gender: gender as "male" | "female",
      phone,
      email,
      meansOfId,
      state: CONSTITUENCY_STATE,
      lga,
      ward,
      pollingUnitCode,
      pollingUnitName,
      photoBytes,
      signatureBytes,
      authorityName: authority.full_name,
      authoritySignatureBytes: await downloadAuthoritySignature(admin, authority.signature_storage_path),
      submissionDate: new Date(),
    });
  } catch (err) {
    console.error("[agents] PDF generation failed for nomination", insertedId, err);
    // The nomination row and source files are already saved; only the
    // rendered PDF is missing. Not rolled back — losing an already-successful
    // submission would be worse than a PDF that can be regenerated later.
    await admin.from("agent_nomination_files").insert([
      { nomination_id: insertedId, file_type: "pvc_copy", storage_path: pvcPath },
      { nomination_id: insertedId, file_type: "passport_photo", storage_path: photoPath },
      { nomination_id: insertedId, file_type: "specimen_signature", storage_path: signaturePath },
    ]);
    return { referenceId };
  }

  const pdfPath = `nominations/${insertedId}/form.pdf`;
  const { error: pdfUploadError } = await admin.storage
    .from("agent-nominations")
    .upload(pdfPath, pdfBytes, { contentType: "application/pdf", upsert: false });

  const fileRows = [
    { nomination_id: insertedId, file_type: "pvc_copy", storage_path: pvcPath },
    { nomination_id: insertedId, file_type: "passport_photo", storage_path: photoPath },
    { nomination_id: insertedId, file_type: "specimen_signature", storage_path: signaturePath },
  ];
  if (!pdfUploadError) {
    fileRows.push({ nomination_id: insertedId, file_type: "generated_pdf", storage_path: pdfPath });
  }
  await admin.from("agent_nomination_files").insert(fileRows);

  return { referenceId };
}

async function downloadAuthoritySignature(
  admin: ReturnType<typeof createAdminSupabase>,
  storagePath: string,
): Promise<Uint8Array> {
  const { data, error } = await admin.storage.from("agent-nominations").download(storagePath);
  if (error || !data) throw new Error("Could not load authority signature");
  return new Uint8Array(await data.arrayBuffer());
}
```

- [ ] **Step 2: Verify with a build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 3: Scripted end-to-end smoke test**

This calls the real server action directly (same technique used for the Foundation dev-only admin UI), so it exercises the actual code path, not a re-implementation of it. Requires a real `nomination_authorities` row with a real signature on file — create one via the dev-only admin UI first (`/admin/agent-nominations/authorities`, running `npm run dev`), noting its `slug`, or create one with a short script mirroring the action in `src/app/admin/(dashboard)/agent-nominations/authorities/actions.ts`.

Write `/tmp/verify-submit.mjs`:

```js
import { readFile } from "node:fs/promises";

const AUTHORITY_SLUG = process.env.TEST_AUTHORITY_SLUG; // set this to a real slug before running

const { submitNomination } = await import("./src/app/agents/actions/submit.ts");

const photoBytes = await readFile("/tmp/agent-pdf-test-photo.jpg");
const signatureBytes = await readFile("/tmp/agent-pdf-test-signature.png");

const formData = new FormData();
formData.set("slug", AUTHORITY_SLUG);
formData.set("first_name", "Test");
formData.set("other_names", "");
formData.set("surname", "Nominee");
formData.set("gender", "male");
formData.set("phone", "08011122233");
formData.set("email", "");
formData.set("means_of_id", "PVC");
formData.set("lga", "Ibadan North-West");
formData.set("ward", "3");
formData.set("polling_unit_code", "REPLACE_WITH_REAL_PU_CODE");
formData.set("polling_unit_name", "REPLACE_WITH_REAL_PU_NAME");
formData.set("attested", "true");
formData.set("pvc_file", new File([photoBytes], "pvc.jpg", { type: "image/jpeg" }));
formData.set("photo_file", new File([photoBytes], "photo.jpg", { type: "image/jpeg" }));
formData.set("signature_file", new File([signatureBytes], "signature.png", { type: "image/png" }));

const result = await submitNomination({}, formData);
console.log("result:", result);
```

Look up a real `pu_code`/`pu_name` pair first via `mcp__supabase__execute_sql` (`select pu_code, pu_name from constituency_geo where lga = 'Ibadan North-West' and ward = 3 limit 1;`) and fill those two placeholders in before running.

Run: `TEST_AUTHORITY_SLUG=<real-slug> npx tsx /tmp/verify-submit.mjs`
Expected: `{ referenceId: '<8-char code>' }`, no `error`.

Then verify via `mcp__supabase__execute_sql`:
```sql
select id, reference_id, status, form_no from public.agent_nominations where reference_id = '<the code printed above>';
select file_type, storage_path from public.agent_nomination_files where nomination_id = '<the id from the row above>' order by file_type;
```
Expected: one `agent_nominations` row with `status = 'submitted'`; four `agent_nomination_files` rows (`pvc_copy`, `passport_photo`, `specimen_signature`, `generated_pdf`).

Also verify the honeypot: re-run with `formData.set("website", "spam")` added — expected: `{ error: 'Something went wrong. Please try again.' }` and no new row in `agent_nominations` (recheck the count from before).

Clean up the test row afterward:
```sql
delete from public.agent_nomination_files where nomination_id = '<the id>';
delete from public.agent_nominations where id = '<the id>';
```
And remove the uploaded test files via `mcp__supabase__execute_sql` is not applicable to Storage — use the admin client in a short follow-up script, or leave them (they're a few KB in a private bucket with no cost concern for a one-off smoke test); prefer removing them if convenient.

- [ ] **Step 4: Commit**

```bash
git add src/app/agents/actions/submit.ts
git commit -m "feat(agents): add nominee submission server action"
```

---

## Task 4: Nominee-facing wizard UI

**Files:**
- Create: `src/app/agents/submit/[slug]/page.tsx`
- Create: `src/app/agents/submit/[slug]/nomination-wizard.tsx`
- Create: `src/app/agents/submit/[slug]/steps/bio-step.tsx`
- Create: `src/app/agents/submit/[slug]/steps/contact-step.tsx`
- Create: `src/app/agents/submit/[slug]/steps/identification-step.tsx`
- Create: `src/app/agents/submit/[slug]/steps/location-step.tsx`
- Create: `src/app/agents/submit/[slug]/steps/signature-step.tsx`
- Create: `src/app/agents/submit/[slug]/steps/preview-step.tsx`
- Create: `src/app/agents/submit/[slug]/photo-upload.tsx`
- Create: `src/app/agents/submit/[slug]/signature-pad.tsx`
- Create: `src/app/agents/submit/[slug]/confirmation.tsx`

**Interfaces:**
- Consumes: `submitNomination`/`SubmitNominationState` (Task 3); `NominationDraftFields`/`loadDraft`/`saveDraft`/`clearDraft` (Task 1); `isValidPhone`/`isValidEmail`/`ALLOWED_PVC_TYPES`/`ALLOWED_PHOTO_TYPES`/`isValidFile` (Task 1); `CONSTITUENCY_STATE` (Task 1); `getAllConstituencyGeo`/`GeoRow` from `@/lib/portal/geo` (existing); `ELECTION_TYPE_LABELS`/`ElectionType` from `@/lib/agents/constants`; form primitives from `@/components/form`.
- All files in this task are interdependent (the wizard cannot render without every step component existing) and are therefore one deliverable, verified together.

- [ ] **Step 1: Write the route page**

```tsx
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getAllConstituencyGeo } from "@/lib/portal/geo";
import { ELECTION_TYPE_LABELS, type ElectionType } from "@/lib/agents/constants";
import { NominationWizard } from "@/app/agents/submit/[slug]/nomination-wizard";

export const dynamic = "force-dynamic";

export default async function SubmitNominationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const admin = createAdminSupabase();
  const { data: authority } = await admin
    .from("nomination_authorities")
    .select("id, full_name, office, election_type, slug, is_active")
    .eq("slug", slug)
    .maybeSingle();

  if (!authority || !authority.is_active) {
    return (
      <div className="flex min-h-screen items-center justify-center px-5 py-12">
        <div className="max-w-sm text-center">
          <h1 className="font-heading text-xl text-text">This link isn&apos;t active</h1>
          <p className="mt-2 text-sm text-text-muted">
            Check the link you were given, or contact the person who shared it with you.
          </p>
        </div>
      </div>
    );
  }

  const geo = await getAllConstituencyGeo();

  return (
    <NominationWizard
      slug={authority.slug}
      authorityOffice={authority.office}
      electionTypeLabel={ELECTION_TYPE_LABELS[authority.election_type as ElectionType]}
      geo={geo}
    />
  );
}
```

- [ ] **Step 2: Write the bio step**

```tsx
"use client";

import { TextField, SelectField } from "@/components/form";
import type { NominationDraftFields } from "@/lib/agents/draft-storage";

const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];

export function BioStep({
  draft,
  onChange,
}: {
  draft: NominationDraftFields;
  onChange: (patch: Partial<NominationDraftFields>) => void;
}) {
  return (
    <div className="space-y-4">
      <TextField
        name="first_name"
        label="First Name"
        autoFocus
        value={draft.firstName}
        onChange={(v) => onChange({ firstName: v })}
      />
      <TextField
        name="other_names"
        label="Other Name(s)"
        optional
        value={draft.otherNames}
        onChange={(v) => onChange({ otherNames: v })}
      />
      <TextField
        name="surname"
        label="Surname"
        value={draft.surname}
        onChange={(v) => onChange({ surname: v })}
      />
      <SelectField
        name="gender"
        label="Gender"
        value={draft.gender}
        onChange={(v) => onChange({ gender: v as "male" | "female" })}
        options={GENDER_OPTIONS}
        placeholder="Select gender"
      />
    </div>
  );
}
```

- [ ] **Step 3: Write the contact step**

```tsx
"use client";

import { TextField } from "@/components/form";
import type { NominationDraftFields } from "@/lib/agents/draft-storage";

export function ContactStep({
  draft,
  onChange,
}: {
  draft: NominationDraftFields;
  onChange: (patch: Partial<NominationDraftFields>) => void;
}) {
  return (
    <div className="space-y-4">
      <TextField
        name="phone"
        label="Phone Number"
        type="tel"
        inputMode="tel"
        autoFocus
        helper="e.g. 08012345678"
        value={draft.phone}
        onChange={(v) => onChange({ phone: v })}
      />
      <TextField
        name="email"
        label="Email Address"
        type="email"
        optional
        value={draft.email}
        onChange={(v) => onChange({ email: v })}
      />
    </div>
  );
}
```

- [ ] **Step 4: Write the identification step**

```tsx
"use client";

import { TextField } from "@/components/form";
import type { NominationDraftFields } from "@/lib/agents/draft-storage";
import { ALLOWED_PVC_TYPES, isValidFile } from "@/lib/agents/validation";

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
      <TextField
        name="means_of_id"
        label="Means of ID"
        helper="Defaults to PVC, as required by the Notice"
        value={draft.meansOfId}
        onChange={(v) => onChange({ meansOfId: v })}
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
```

- [ ] **Step 5: Write the photo upload component**

```tsx
"use client";

import { useRef, useState } from "react";
import { ALLOWED_PHOTO_TYPES, isValidFile } from "@/lib/agents/validation";

const MAX_DIMENSION = 800;
const JPEG_QUALITY = 0.82;

/** Resizes/compresses an image client-side via canvas, returns a JPEG File. */
async function compressImage(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, width, height);

  const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY));
  if (!blob) return file;
  return new File([blob], "photo.jpg", { type: "image/jpeg" });
}

/** Soft, non-blocking check: samples the four corners and warns if they don't look red. */
function checkRedBackground(canvas: HTMLCanvasElement): boolean {
  const ctx = canvas.getContext("2d");
  if (!ctx) return true;
  const { width, height } = canvas;
  const points: [number, number][] = [
    [4, 4],
    [width - 4, 4],
    [4, height - 4],
    [width - 4, height - 4],
  ];
  let redCount = 0;
  for (const [x, y] of points) {
    const [r, g, b] = ctx.getImageData(x, y, 1, 1).data;
    if (r > 110 && r > g + 25 && r > b + 25) redCount++;
  }
  return redCount >= 3;
}

export function PhotoUpload({
  photoFile,
  onPhotoFileChange,
}: {
  photoFile: File | null;
  onPhotoFileChange: (file: File | null) => void;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setWarning(null);
    if (!file || !isValidFile(file, ALLOWED_PHOTO_TYPES)) {
      onPhotoFileChange(null);
      setPreviewUrl(null);
      return;
    }

    const compressed = await compressImage(file);
    onPhotoFileChange(compressed);
    setPreviewUrl(URL.createObjectURL(compressed));

    const bitmap = await createImageBitmap(compressed);
    const canvas = canvasRef.current ?? document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(bitmap, 0, 0);
      if (!checkRedBackground(canvas)) {
        setWarning(
          "Background does not appear red — the Notice requires a red-background photo. You can still submit; an admin will review it.",
        );
      }
    }
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-text">Passport Photograph</label>
      <p className="text-xs text-text-muted">Must have a red background, per the Notice.</p>
      <input
        type="file"
        accept="image/jpeg,image/png"
        onChange={handleFile}
        className="w-full rounded-brand border border-border bg-bg px-3.5 py-2.5 text-sm text-text file:mr-3 file:rounded-brand file:border-0 file:bg-surface-2 file:px-3 file:py-1.5 file:text-sm file:text-text"
      />
      {previewUrl && (
        <div className="relative h-40 w-32 overflow-hidden rounded-brand border border-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt="Photo preview" className="h-full w-full object-cover" />
          <div
            className="pointer-events-none absolute inset-2 rounded border-2 border-dashed border-red-500/70"
            aria-hidden
          />
        </div>
      )}
      {warning && <p className="text-xs text-yellow-600">{warning}</p>}
      {photoFile && !warning && <p className="text-xs text-accent">Photo looks good.</p>}
      <canvas ref={canvasRef} className="hidden" aria-hidden />
    </div>
  );
}
```

- [ ] **Step 6: Write the location step**

```tsx
"use client";

import { useMemo } from "react";
import { SelectField } from "@/components/form";
import type { NominationDraftFields } from "@/lib/agents/draft-storage";
import type { GeoRow } from "@/lib/portal/geo";

export function LocationStep({
  draft,
  onChange,
  geo,
}: {
  draft: NominationDraftFields;
  onChange: (patch: Partial<NominationDraftFields>) => void;
  geo: GeoRow[];
}) {
  const lgas = useMemo(() => Array.from(new Set(geo.map((g) => g.lga))), [geo]);
  const wards = useMemo(
    () => Array.from(new Set(geo.filter((g) => g.lga === draft.lga).map((g) => g.ward))).sort((a, b) => a - b),
    [geo, draft.lga],
  );
  const pollingUnits = useMemo(
    () => geo.filter((g) => g.lga === draft.lga && g.ward === Number(draft.ward)),
    [geo, draft.lga, draft.ward],
  );

  return (
    <div className="space-y-4">
      <SelectField
        name="lga"
        label="LGA"
        value={draft.lga}
        onChange={(v) => onChange({ lga: v, ward: "", pollingUnitCode: "", pollingUnitName: "" })}
        options={lgas.map((lga) => ({ value: lga, label: lga }))}
        placeholder="Select LGA"
      />
      <SelectField
        name="ward"
        label="Ward (Registration Area)"
        value={draft.ward}
        onChange={(v) => onChange({ ward: v, pollingUnitCode: "", pollingUnitName: "" })}
        options={wards.map((w) => ({ value: String(w), label: `Ward ${w}` }))}
        placeholder="Select ward"
        disabledReason={draft.lga ? undefined : "Select an LGA first"}
      />
      <SelectField
        name="polling_unit_code"
        label="Polling Unit"
        value={draft.pollingUnitCode}
        onChange={(v) => {
          const pu = pollingUnits.find((p) => p.pu_code === v);
          onChange({ pollingUnitCode: v, pollingUnitName: pu?.pu_name ?? "" });
        }}
        options={pollingUnits.map((p) => ({ value: p.pu_code, label: `${p.pu_code} — ${p.pu_name}` }))}
        placeholder="Select polling unit"
        disabledReason={draft.ward ? undefined : "Select a ward first"}
      />
    </div>
  );
}
```

- [ ] **Step 7: Write the signature pad and step**

```tsx
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
```

```tsx
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
          You&apos;ve already signed. The box below is blank until you draw again — only redraw if you want to
          change your signature.
        </p>
      )}
      <SignaturePad onChange={onSignatureChange} />
    </div>
  );
}
```

(Write `signature-pad.tsx` and `steps/signature-step.tsx` as two separate files with the two code blocks above, respectively.)

- [ ] **Step 8: Write the preview step**

```tsx
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
    if (!photoFile) {
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
```

- [ ] **Step 9: Write the confirmation component**

```tsx
export function Confirmation({ referenceId }: { referenceId: string }) {
  return (
    <div className="mx-auto max-w-lg px-5 py-16 text-center">
      <h1 className="font-heading text-2xl text-text">Submission received</h1>
      <p className="mt-3 text-sm text-text-muted">
        Thank you — your nomination has been submitted. Keep this reference number for your records.
      </p>
      <p className="mt-6 font-mono text-2xl tracking-wide text-accent">{referenceId}</p>
    </div>
  );
}
```

- [ ] **Step 10: Write the wizard shell**

```tsx
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
  authorityOffice,
  electionTypeLabel,
  geo,
}: {
  slug: string;
  authorityOffice: string;
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
    const saved = loadDraft(slug);
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
    return <Confirmation referenceId={actionState.referenceId} />;
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
      setStepError("Something is missing — please go back and check every step.");
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
        {electionTypeLabel} — {authorityOffice}
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
```

- [ ] **Step 11: Verify with a build**

Run: `npm run build`
Expected: succeeds with no type errors. Confirm the route appears:

```bash
npm run build 2>&1 | grep "submit"
```
Expected: `/agents/submit/[slug]` listed.

- [ ] **Step 12: Manual smoke test — full wizard walkthrough**

Run `npm run dev`, sign in to `/admin/agent-nominations/authorities` and grab (or create) a real active authority's slug, then visit `http://localhost:3000/agents/submit/<slug>`.

Walk through every step: bio, contact, identification (upload any small JPEG/PNG as the PVC), photo (upload a small JPEG — try one with an obviously non-red background first to confirm the soft warning appears, then proceed anyway to confirm it doesn't block), location (confirm LGA → Ward → Polling Unit cascades and resets correctly when an earlier one changes), signature (draw something, confirm "Clear" works), preview (confirm every field shows what was entered, the photo and signature thumbnails render, the attestation checkbox is required), then Confirm & Submit.

Expected: a reference ID confirmation screen appears. Reload the page mid-way through a fresh attempt (e.g. after filling bio+contact) to confirm the autosave restores those text fields (files and signature are expected to reset — per the spec's accepted limitation).

Also visit `http://localhost:3000/agents/submit/not-a-real-slug` — expected: the "This link isn't active" message, not a crash.

- [ ] **Step 13: Commit**

```bash
git add src/app/agents/submit
git commit -m "feat(agents): add the nominee-facing submission wizard"
```

---

## Task 5: Final verification pass

**Files:** none (verification only)

- [ ] **Step 1: Lint**

Run: `npm run lint`
Expected: no new errors attributable to files created in this plan (the repo has pre-existing unrelated lint errors in `blog-editor.tsx`/`donate-form.tsx`/admin `page.tsx`, noted and left alone during Foundation — confirm the count of errors in those specific files hasn't changed, and that no `src/app/agents/**` or `src/lib/agents/**` file appears in the output).

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 3: Confirm no stray test data remains**

Call `mcp__supabase__execute_sql` with `project_id: "atavwpoistostnqxmeal"`:
```sql
select count(*) from public.agent_nominations where phone in ('08011122233', '08012345678');
```
Expected: `0` — confirms Task 3's scripted smoke test data was cleaned up (re-run the delete statements from Task 3 Step 3 if this returns non-zero).

- [ ] **Step 4: Confirm no stray uncommitted changes**

Run: `git status`
Expected: clean tree.
