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
  idFileBytes: Uint8Array;
  idFileContentType: "image/jpeg" | "image/png" | "application/pdf";
  authorizedNominatorName: string;
  authorizedNominatorSignatureBytes: Uint8Array;
  submissionDate: Date;
};

const TEMPLATE_PATH = path.join(
  process.cwd(),
  "src/lib/agents/pdf-template/party-agent-nomination-form.pdf",
);

/** ElectionType values are snake_case; CHECKBOXES.electionType keys are camelCase. */
const ELECTION_TYPE_CHECKBOX_KEY: Record<ElectionType, keyof typeof CHECKBOXES.electionType> = {
  presidential: "presidential",
  governorship: "governorship",
  senatorial: "senatorial",
  house_of_reps: "houseOfReps",
  house_of_assembly: "houseOfAssembly",
};

function formatDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

/**
 * Appends the nominee's uploaded means-of-ID document as a new final page.
 * Images are embedded and drawn full-page (same technique as the existing
 * photo/signature boxes). A PDF upload has only its first page copied in —
 * multi-page ID scans (e.g. front+back) are capped at page 1 by design.
 */
async function appendIdPage(
  doc: PDFDocument,
  bytes: Uint8Array,
  contentType: "image/jpeg" | "image/png" | "application/pdf",
): Promise<void> {
  if (contentType === "application/pdf") {
    const idDoc = await PDFDocument.load(bytes);
    const [copiedPage] = await doc.copyPages(idDoc, [0]);
    doc.addPage(copiedPage);
    return;
  }

  const embedded = contentType === "image/png" ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
  const page = doc.addPage([embedded.width, embedded.height]);
  page.drawImage(embedded, { x: 0, y: 0, width: embedded.width, height: embedded.height });
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

  check(CHECKBOXES.electionType[ELECTION_TYPE_CHECKBOX_KEY[input.electionType]]);
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
  text(input.authorizedNominatorName, TEXT_FIELDS.authorisedNominatorName);
  text(dateStr, TEXT_FIELDS.authorisedNominatorDate);

  await image(input.photoBytes, PHOTO_BOX);
  await image(input.signatureBytes, SIGNATURE_BOXES.specimen);
  await image(input.signatureBytes, SIGNATURE_BOXES.attestation);
  await image(input.authorizedNominatorSignatureBytes, SIGNATURE_BOXES.authorisedNominator);

  await appendIdPage(doc, input.idFileBytes, input.idFileContentType);

  return doc.save();
}
