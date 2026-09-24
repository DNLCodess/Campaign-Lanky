import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, PDFPage, rgb } from "pdf-lib";
import sharp from "sharp";
import fontkit from "@pdf-lib/fontkit";
import {
  CHECKBOXES,
  TEXT_FIELDS,
  TEXT_FIELD_MAX_WIDTHS,
  PHOTO_BOX,
  SIGNATURE_BOXES,
} from "@/lib/agents/pdf-template/form-template";
import type { ElectionType } from "@/lib/agents/constants";
import { formatPollingUnitCode } from "@/lib/agents/format";

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

// The official Notice template's pre-printed text is set in Calibri
// (confirmed via `pdffonts` on the source PDF). Calibri itself is a
// Microsoft-licensed font we can't redistribute, so filled-in text uses
// Carlito — a free, metrically-compatible substitute for Calibri (the same
// one LibreOffice/Linux use as a drop-in Calibri replacement) — so typed
// values visually match the form's own labels instead of standing out in a
// different font family.
const FONT_PATH = path.join(process.cwd(), "src/lib/agents/pdf-template/fonts/Carlito-Regular.ttf");

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

/** Written into every generated PDF so older, differently laid-out ones can be recognised and rebuilt. */
export const PDF_LAYOUT_VERSION = "layout-v3";

const ID_PAGE_MARGIN = 40; // top offset of the ID on its page

// A standard ID-1 card (PVC, NIN slip, driver's licence) is 85.6 x 54 mm,
// about 243 x 153 pt. Photos of one are shown at a comfortable ~1.3x of that,
// which is large enough to read but nowhere near filling the A4 page.
const ID_CARD_MAX_LONG_SIDE = 320;
const ID_CARD_MAX_SHORT_SIDE = 220;

/**
 * Appends the nominee's uploaded means-of-ID document as a new final page,
 * on a page the same size as the form itself. Nothing is ever cropped or
 * stretched. An image is sized to look like the card it is (see
 * ID_CARD_MAX_*), in whichever orientation it was photographed, whether the
 * photo is huge or tiny. A PDF upload gets the same treatment on its first
 * page, so a card scanned onto a full A4 sheet comes out smaller than the card
 * itself (the sheet's blank margins are scaled down with it). Only
 * page 1 is copied — multi-page ID scans (e.g. front+back) are capped there by
 * design.
 */
async function appendIdPage(
  doc: PDFDocument,
  bytes: Uint8Array,
  contentType: "image/jpeg" | "image/png" | "application/pdf",
): Promise<void> {
  const { width: pageWidth, height: pageHeight } = doc.getPages()[0].getSize();

  let source: { width: number; height: number };
  let draw: (page: PDFPage, box: { x: number; y: number; width: number; height: number }) => void;

  if (contentType === "application/pdf") {
    const idDoc = await PDFDocument.load(bytes);
    const embeddedPage = await doc.embedPage(idDoc.getPage(0));
    source = embeddedPage;
    draw = (page, box) => page.drawPage(embeddedPage, box);
  } else {
    // Phones store photos in the sensor's orientation plus a "rotate me" flag
    // that pdf-lib ignores, so a card photographed upright would land sideways.
    // Apply the flag, flatten any transparency onto white, and cap the pixel
    // size (1600px is ~360 dpi at the size it is printed) to keep PDFs small.
    const upright = await sharp(bytes)
      .rotate()
      .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: 88 })
      .toBuffer();
    const embedded = await doc.embedJpg(upright);
    source = embedded;
    draw = (page, box) => page.drawImage(embedded, box);
  }

  // Fit inside the card-sized limit for its orientation, preserving aspect
  // ratio, growing or shrinking as needed.
  const limit =
    source.width >= source.height
      ? { width: ID_CARD_MAX_LONG_SIDE, height: ID_CARD_MAX_SHORT_SIDE }
      : { width: ID_CARD_MAX_SHORT_SIDE, height: ID_CARD_MAX_LONG_SIDE };
  const scale = Math.min(limit.width / source.width, limit.height / source.height);
  const width = source.width * scale;
  const height = source.height * scale;

  const page = doc.addPage([pageWidth, pageHeight]);
  draw(page, {
    x: (pageWidth - width) / 2,
    y: pageHeight - ID_PAGE_MARGIN - height, // top-aligned, like a scanned attachment
    width,
    height,
  });
}

/** Generates the pixel-mapped Party Agent Nomination Form PDF for one submission. */
export async function generateNominationPdf(input: GeneratePdfInput): Promise<Uint8Array> {
  const templateBytes = await readFile(TEMPLATE_PATH);
  const doc = await PDFDocument.load(templateBytes);
  doc.registerFontkit(fontkit);
  const page = doc.getPages()[0];
  const fontBytes = await readFile(FONT_PATH);
  const font = await doc.embedFont(fontBytes);
  const fontSize = 10;

  // `maxWidth` (pt): the printed box a value must stay inside. Most fields
  // are short/bounded enough that this never engages (matches the sizing
  // already verified against real submissions), but a long polling unit
  // name at this larger font size was overflowing its box — this shrinks
  // that one value (and anything else long) down to fit, the same way
  // embedded images are already scaled to fit their boxes, rather than
  // drawing text off the edge of the printed line.
  function text(value: string, point: { x: number; y: number }, maxWidth?: number) {
    if (!value) return;
    let size = fontSize;
    if (maxWidth) {
      const width = font.widthOfTextAtSize(value, size);
      if (width > maxWidth) size = Math.max(6, size * (maxWidth / width));
    }
    page.drawText(value, { x: point.x, y: point.y, size, font, color: rgb(0, 0, 0) });
  }
  function check(point: { x: number; y: number }) {
    // CHECKBOXES coordinates are each box's own center (measured directly
    // off the template). drawText positions a glyph's baseline-left corner,
    // not its visual center, so without this the "X" renders shifted up and
    // right of the box it's meant to mark. Center the glyph on the point
    // instead: half its advance width horizontally, half its cap-height-ish
    // ascent vertically.
    const glyphWidth = font.widthOfTextAtSize("X", fontSize);
    const glyphHeight = font.heightAtSize(fontSize, { descender: false });
    page.drawText("X", {
      x: point.x - glyphWidth / 2,
      y: point.y - glyphHeight / 2,
      size: fontSize,
      font,
      color: rgb(0, 0, 0),
    });
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
  text(input.firstName, TEXT_FIELDS.firstName, TEXT_FIELD_MAX_WIDTHS.firstName);
  text(input.otherNames, TEXT_FIELDS.otherNames, TEXT_FIELD_MAX_WIDTHS.otherNames);
  text(input.surname, TEXT_FIELDS.surname, TEXT_FIELD_MAX_WIDTHS.surname);
  text(input.phone, TEXT_FIELDS.phoneNumber, TEXT_FIELD_MAX_WIDTHS.phoneNumber);
  text(input.email, TEXT_FIELDS.emailAddress, TEXT_FIELD_MAX_WIDTHS.emailAddress);
  text(input.meansOfId, TEXT_FIELDS.meansOfId, TEXT_FIELD_MAX_WIDTHS.meansOfId);
  text(input.state, TEXT_FIELDS.state, TEXT_FIELD_MAX_WIDTHS.state);
  text(input.lga, TEXT_FIELDS.lga, TEXT_FIELD_MAX_WIDTHS.lga);
  text(String(input.ward), TEXT_FIELDS.registrationArea);
  text(formatPollingUnitCode(input.pollingUnitCode), TEXT_FIELDS.pollingUnitCode, TEXT_FIELD_MAX_WIDTHS.pollingUnitCode);
  text(input.pollingUnitName, TEXT_FIELDS.pollingUnitName, TEXT_FIELD_MAX_WIDTHS.pollingUnitName);
  // The template's own instruction here only lists Ward/LGA/STATE/National/
  // State Constituency/Federal Constituency/Senatorial District — "Polling
  // Unit" isn't one of them. Results collate upward from a Polling Unit
  // Agent through their Ward, so this indicates the nominee's own ward.
  text(`Ward ${input.ward}`, TEXT_FIELDS.collationAgentDetail, 200);

  const fullName = [input.firstName, input.otherNames, input.surname].filter(Boolean).join(" ");
  const dateStr = formatDate(input.submissionDate);
  text(fullName, TEXT_FIELDS.attestationName, TEXT_FIELD_MAX_WIDTHS.attestationName);
  text(dateStr, TEXT_FIELDS.attestationDate);
  text(input.authorizedNominatorName, TEXT_FIELDS.authorisedNominatorName, TEXT_FIELD_MAX_WIDTHS.authorisedNominatorName);
  text(dateStr, TEXT_FIELDS.authorisedNominatorDate);

  await image(input.photoBytes, PHOTO_BOX);
  await image(input.signatureBytes, SIGNATURE_BOXES.specimen);
  await image(input.signatureBytes, SIGNATURE_BOXES.attestation);
  await image(input.authorizedNominatorSignatureBytes, SIGNATURE_BOXES.authorisedNominator);

  await appendIdPage(doc, input.idFileBytes, input.idFileContentType);
  doc.setKeywords([PDF_LAYOUT_VERSION]);

  return doc.save();
}
