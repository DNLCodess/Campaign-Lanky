"use client";

/**
 * TEMPORARY DEV TOOL — see page.tsx for the deletion note.
 *
 * Renders every field pdf-generate.ts draws (checkboxes, text fields, photo
 * box, signature boxes) as a draggable overlay on top of a static render of
 * the blank template (public/dev/pdf-calibrator-template.png, rendered from
 * party-agent-nomination-form.pdf at 150dpi). Coordinates are stored in PDF
 * points — the same unit form-template.ts uses — and converted to/from
 * on-screen pixels only for display, so the exported config can be pasted
 * straight back into that file.
 *
 * The text position here approximates pdf-lib's baseline-left drawText
 * anchor (a tight-line-height box bottom-aligned near the point), not an
 * exact reproduction of pdf-lib's font-metrics baseline — close enough to
 * calibrate by eye, with the real generated PDF as the final check.
 *
 * Long-value handling mirrors pdf-generate.ts's shrink-to-fit (same
 * TEXT_FIELD_MAX_WIDTHS, same proportional-shrink-with-a-6pt-floor formula),
 * measured via Canvas2D's measureText with the same Carlito font — close
 * enough to preview by eye, not a pixel-exact reproduction of pdf-lib's own
 * font-metrics measurement.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { TEXT_FIELD_MAX_WIDTHS } from "@/lib/agents/pdf-template/form-template";

const PAGE_W_PT = 595.3;
const PAGE_H_PT = 841.9;
const IMAGE_W_PX = 1241;
const IMAGE_H_PX = 1754;
const SCALE = IMAGE_W_PX / PAGE_W_PT; // px per pt, ≈2.0833 (150dpi / 72)

type Kind = "checkbox" | "text" | "box";

type FieldState = {
  kind: Kind;
  label: string;
  sample?: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
};

// Seeded from the live values in src/lib/agents/pdf-template/form-template.ts
// at the time this tool was built — adjust from here, not from scratch.
const INITIAL_FIELDS: Record<string, FieldState> = {
  "checkboxes.electionType.presidential": { kind: "checkbox", label: "Election: Presidential", x: 193.5, y: 654.9 },
  "checkboxes.electionType.governorship": { kind: "checkbox", label: "Election: Governorship", x: 272.3, y: 654.9 },
  "checkboxes.electionType.senatorial": { kind: "checkbox", label: "Election: Senatorial", x: 343.3, y: 654.9 },
  "checkboxes.electionType.houseOfReps": { kind: "checkbox", label: "Election: House of Reps", x: 433.1, y: 654.9 },
  "checkboxes.electionType.houseOfAssembly": {
    kind: "checkbox",
    label: "Election: House of Assembly",
    x: 545.8,
    y: 654.9,
  },
  "checkboxes.agentFor.pollingUnit": { kind: "checkbox", label: "Agent for: Polling Unit", x: 193.5, y: 639.9 },
  "checkboxes.agentFor.wardCollation": { kind: "checkbox", label: "Agent for: Ward Collation", x: 278.1, y: 639.9 },
  "checkboxes.agentFor.lgaCollation": { kind: "checkbox", label: "Agent for: LGA Collation", x: 353.14, y: 640.64 },
  "checkboxes.agentFor.stateCollation": { kind: "checkbox", label: "Agent for: State Collation", x: 439.0, y: 639.9 },
  "checkboxes.agentFor.nationalCollation": {
    kind: "checkbox",
    label: "Agent for: National Collation",
    x: 536.6,
    y: 639.9,
  },
  "checkboxes.agentFor.stateConstCollation": {
    kind: "checkbox",
    label: "Agent for: State Const. Collation",
    x: 264.6,
    y: 624.5,
  },
  "checkboxes.agentFor.fedConstCollation": {
    kind: "checkbox",
    label: "Agent for: Fed. Const. Collation",
    x: 406.4,
    y: 624.5,
  },
  "checkboxes.agentFor.senDistCollation": {
    kind: "checkbox",
    label: "Agent for: Sen. Dist. Collation",
    x: 540.9,
    y: 624.5,
  },
  "checkboxes.gender.male": { kind: "checkbox", label: "Gender: Male", x: 258.8, y: 501.0 },
  "checkboxes.gender.female": { kind: "checkbox", label: "Gender: Female", x: 363.1, y: 501.0 },

  // Sample values are deliberately real-world worst cases, not typical
  // ones: the longest actual polling unit name in constituency_geo (90
  // chars), the longest actual LGA name, phone/email/name values at the
  // exact validation caps from src/lib/agents/validation.ts (MAX_NAME_LENGTH
  // / MAX_EMAIL_LENGTH / MAX_FULL_NAME_LENGTH), and a title-heavy Authorised
  // Nominator name — so what you see here previews the worst a real
  // generated PDF will ever actually show, not just a short happy-path
  // example. Long-value shrink-to-fit isn't replicated in this preview
  // (pdf-generate.ts's font-metrics-based shrink can't be reproduced
  // pixel-exactly with CSS) — verify final sizing against a real generated
  // PDF, not this overlay.
  "textFields.formNo": { kind: "text", label: "Form No.", sample: "9", x: 487.8, y: 601.1 },
  "textFields.firstName": {
    kind: "text",
    label: "First Name",
    sample: "Oluwaseunfunmilayoadewale", // 25 chars — part of the 76-char combined worst case below
    x: 150.4,
    y: 568.5,
  },
  "textFields.otherNames": {
    kind: "text",
    label: "Other Names",
    sample: "Ayodejioluwatobilobaakin", // 24 chars
    x: 150.4,
    y: 544.5,
  },
  "textFields.surname": {
    kind: "text",
    label: "Surname",
    sample: "Adebayoogunlesiolatunjide", // 25 chars
    x: 150.4,
    y: 520.5,
  },
  "textFields.phoneNumber": {
    kind: "text",
    label: "Phone Number",
    sample: "+2348012345678", // longest valid form the phone regex accepts (14 chars)
    x: 150.4,
    y: 459.88,
  },
  "textFields.emailAddress": {
    kind: "text",
    label: "Email Address",
    sample: "oluwaseunfunmilayo.adewale.ayodejioluwatobiloba@gmail.com", // realistic long, 57 of 100 allowed chars
    x: 148.81,
    y: 433.12,
  },
  "textFields.meansOfId": { kind: "text", label: "Means of ID", sample: "PVC", x: 152.8, y: 395.7 },
  "textFields.state": { kind: "text", label: "State", sample: "Oyo State", x: 104.4, y: 308.3 },
  "textFields.lga": {
    kind: "text",
    label: "LGA",
    sample: "Ibadan South-West", // longest real LGA name in constituency_geo (tied with Ibadan North-West)
    x: 326.02,
    y: 305.99,
  },
  "textFields.registrationArea": { kind: "text", label: "Registration Area", sample: "99", x: 177.49, y: 282.06 },
  "textFields.pollingUnitCode": {
    kind: "text",
    label: "Polling Unit Code",
    sample: "30/08/07/007",
    x: 177.29,
    y: 256.55,
  },
  "textFields.pollingUnitName": {
    kind: "text",
    label: "Polling Unit Name",
    // The actual longest pu_name in constituency_geo (90 chars) — real
    // polling unit names are DB-sourced (picked from a dropdown), not
    // nominee-typed, so this is the true ceiling, not a synthetic one.
    sample: "OPEN SPACE INFRONT OF SUNSHINE DIAMOND SCHOOL, FIRST POWERLINE, MECHANIC VILLAGE JUNCTION.",
    x: 176.07,
    y: 234.55,
  },
  "textFields.collationAgentDetail": {
    kind: "text",
    label: "For Collation Agents (box)",
    sample: "Ward 99",
    x: 350,
    y: 210,
  },
  "textFields.attestationName": {
    kind: "text",
    label: "Attestation Name",
    // pdf-generate.ts draws this as firstName+otherNames+surname joined —
    // same three values as above, joined the same way (76 chars, under the
    // 80-char MAX_FULL_NAME_LENGTH cap that exists specifically because this
    // combined box is narrower than any one of the three individually).
    sample: "Oluwaseunfunmilayoadewale Ayodejioluwatobilobaakin Adebayoogunlesiolatunjide",
    x: 103.4,
    y: 153.3,
  },
  "textFields.attestationDate": {
    kind: "text",
    label: "Attestation Date",
    sample: "22/09/2026",
    x: 415.4,
    y: 123.24,
  },
  "textFields.authorisedNominatorName": {
    kind: "text",
    label: "Authorised Nominator Name",
    // Admin-set, not length-capped — a title-heavy real name is the
    // realistic worst case here, not an arbitrary long string.
    sample: "Chief (Dr.) Atayese Oluwatunji Babatunde Sadiq-Adewumi (FCA, FCIB, MNIM)",
    x: 103.18,
    y: 65.74,
  },
  "textFields.authorisedNominatorDate": {
    kind: "text",
    label: "Authorised Nominator Date",
    sample: "22/09/2026",
    x: 415.51,
    y: 36.74,
  },

  photoBox: { kind: "box", label: "Photo", x: 459.8, y: 484.3, width: 93.1, height: 100.8 },
  "signatureBoxes.specimen": {
    kind: "box",
    label: "Signature: Specimen",
    x: 147.8,
    y: 347.5,
    width: 281.8,
    height: 21.6,
  },
  "signatureBoxes.attestation": {
    kind: "box",
    label: "Signature: Attestation",
    x: 98.4,
    y: 111.3,
    width: 223.2,
    height: 25.9,
  },
  "signatureBoxes.authorisedNominator": {
    kind: "box",
    label: "Signature: Authorised Nominator",
    x: 97.79,
    y: 18.28,
    width: 223.2,
    height: 25.9,
  },
};

const GROUP_ORDER = [
  ["checkboxes.electionType.", "Election Type"],
  ["checkboxes.agentFor.", "Agent For"],
  ["checkboxes.gender.", "Gender"],
  ["textFields.", "Text Fields"],
  ["photoBox", "Photo Box"],
  ["signatureBoxes.", "Signature Boxes"],
] as const;

function groupOf(id: string): string {
  for (const [prefix, label] of GROUP_ORDER) {
    if (id === prefix || id.startsWith(prefix)) return label;
  }
  return "Other";
}

function ptToPx(pt: number): number {
  return pt * SCALE;
}
function pxToPt(px: number): number {
  return px / SCALE;
}
function yPtToTopPx(yPt: number): number {
  return (PAGE_H_PT - yPt) * SCALE;
}

// A fresh <canvas> per call, never persisted (module-level, no component
// state or refs involved) — measureText is a pure, synchronous computation,
// so this is safe to call directly during render, unlike the ref-based
// approach React's stricter ref rules now disallow. Mirrors pdf-generate.ts's
// text() shrink-to-fit: same TEXT_FIELD_MAX_WIDTHS, same
// proportional-shrink-with-a-6pt-floor formula, measured with the same
// Carlito font instead of pdf-lib's own font-metrics (close enough to
// preview by eye — the real generated PDF is still the final check).
function fitFontSizePx(sample: string, fieldKey: string, fontSizePx: number, fontFamily: string): number {
  const maxWidthPt = TEXT_FIELD_MAX_WIDTHS[fieldKey as keyof typeof TEXT_FIELD_MAX_WIDTHS];
  if (!maxWidthPt || !sample) return fontSizePx;
  // This "use client" component still renders once server-side (SSR/RSC)
  // before hydration takes over, where `document` doesn't exist — without
  // this guard that initial pass crashes the whole page with a 500.
  if (typeof document === "undefined") return fontSizePx;
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return fontSizePx;
  ctx.font = `${fontSizePx}px ${fontFamily}`;
  const measuredPx = ctx.measureText(sample).width;
  const maxWidthPx = ptToPx(maxWidthPt);
  if (measuredPx <= maxWidthPx) return fontSizePx;
  return Math.max(ptToPx(6), fontSizePx * (maxWidthPx / measuredPx));
}

function buildExport(fields: Record<string, FieldState>, fontSize: number, fontFamily: string): string {
  const get = (id: string) => fields[id];
  const pt = (n: number) => Math.round(n * 100) / 100;

  const checkboxGroup = (prefix: string, keys: string[]) =>
    keys
      .map((k) => {
        const f = get(`checkboxes.${prefix}.${k}`);
        return `    ${k}: { x: ${pt(f.x)}, y: ${pt(f.y)} },`;
      })
      .join("\n");

  const electionTypeKeys = ["presidential", "governorship", "senatorial", "houseOfReps", "houseOfAssembly"];
  const agentForKeys = [
    "pollingUnit",
    "wardCollation",
    "lgaCollation",
    "stateCollation",
    "nationalCollation",
    "stateConstCollation",
    "fedConstCollation",
    "senDistCollation",
  ];
  const genderKeys = ["male", "female"];

  const textFieldKeys = Object.keys(fields)
    .filter((id) => id.startsWith("textFields."))
    .map((id) => id.replace("textFields.", ""));

  const textFieldsBlock = textFieldKeys
    .map((k) => {
      const f = get(`textFields.${k}`);
      return `  ${k}: { x: ${pt(f.x)}, y: ${pt(f.y)} },`;
    })
    .join("\n");

  const photo = get("photoBox");
  const sig = (k: string) => {
    const f = get(`signatureBoxes.${k}`);
    return `    ${k}: { x: ${pt(f.x)}, y: ${pt(f.y)}, width: ${pt(f.width ?? 0)}, height: ${pt(f.height ?? 0)} },`;
  };

  return `// Generated by the PDF calibrator dev tool. Paste into src/lib/agents/pdf-template/form-template.ts.
// fontSize to use in pdf-generate.ts: ${fontSize}
// fontFamily checked in the calibrator: ${fontFamily} (production only embeds Carlito; this is FYI only)

export const CHECKBOXES = {
  electionType: {
${checkboxGroup("electionType", electionTypeKeys)}
  },
  agentFor: {
${checkboxGroup("agentFor", agentForKeys)}
  },
  gender: {
${checkboxGroup("gender", genderKeys)}
  },
} as const;

export const TEXT_FIELDS = {
${textFieldsBlock}
} as const;

export const PHOTO_BOX = { x: ${pt(photo.x)}, y: ${pt(photo.y)}, width: ${pt(photo.width ?? 0)}, height: ${pt(photo.height ?? 0)} } as const;

export const SIGNATURE_BOXES = {
${sig("specimen")}
${sig("attestation")}
${sig("authorisedNominator")}
} as const;
`;
}

// Persisted across page loads in this browser only — otherwise every visit
// (or an accidental refresh mid-drag) silently reset back to INITIAL_FIELDS,
// making it look like nothing was ever saved. This is a convenience cache on
// top of that, not a replacement for it: "Copy config" + applying it to
// form-template.ts is still the only durable save.
const STORAGE_KEY = "pdf-calibrator-state:v1";

type PersistedState = {
  fields: Record<string, FieldState>;
  fontSize: number;
  fontFamily: "Carlito" | "Helvetica, Arial, sans-serif";
};

function loadPersisted(): PersistedState | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedState;
  } catch {
    return null;
  }
}

function savePersisted(state: PersistedState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // best-effort only (private browsing, quota, etc) — losing the cache isn't fatal
  }
}

export function PdfCalibrator() {
  const [fields, setFields] = useState<Record<string, FieldState>>(INITIAL_FIELDS);
  const [fontSize, setFontSize] = useState(10);
  const [fontFamily, setFontFamily] = useState<"Carlito" | "Helvetica, Arial, sans-serif">("Carlito");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">("idle");
  const [exportText, setExportText] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ id: string; startPx: number; startPy: number; origX: number; origY: number } | null>(
    null,
  );

  useEffect(() => {
    // Restore whatever was left mid-calibration in this browser, falling
    // back to (and merging in any new fields not present in) the file's own
    // current values. Deferred to an effect, not a lazy useState
    // initializer, so server-rendered HTML and the first client render
    // match (no window during SSR).
    const saved = loadPersisted();
    if (saved) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFields((prev) => ({ ...prev, ...saved.fields }));
      setFontSize(saved.fontSize);
      setFontFamily(saved.fontFamily);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) savePersisted({ fields, fontSize, fontFamily });
  }, [fields, fontSize, fontFamily, hydrated]);

  const updateField = useCallback((id: string, patch: Partial<FieldState>) => {
    setFields((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }, []);

  const resetToFileDefaults = useCallback(() => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // best-effort only
    }
    setFields(INITIAL_FIELDS);
    setFontSize(10);
    setFontFamily("Carlito");
  }, []);

  const onPointerDown = useCallback(
    (id: string) => (e: React.PointerEvent) => {
      e.preventDefault();
      setSelectedId(id);
      const f = fields[id];
      dragState.current = { id, startPx: e.clientX, startPy: e.clientY, origX: f.x, origY: f.y };
      (e.target as Element).setPointerCapture(e.pointerId);
    },
    [fields],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const drag = dragState.current;
      if (!drag) return;
      const dxPx = e.clientX - drag.startPx;
      const dyPx = e.clientY - drag.startPy;
      const newX = drag.origX + pxToPt(dxPx);
      const newY = drag.origY - pxToPt(dyPx); // screen-down is pt-down (pt y grows upward)
      updateField(drag.id, { x: newX, y: newY });
    },
    [updateField],
  );

  const onPointerUp = useCallback(() => {
    dragState.current = null;
  }, []);

  const handleCopy = useCallback(async () => {
    const text = buildExport(fields, fontSize, fontFamily);
    setExportText(text);
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("failed");
    }
    setTimeout(() => setCopyStatus("idle"), 2500);
  }, [fields, fontSize, fontFamily]);

  const groups = new Map<string, string[]>();
  for (const id of Object.keys(fields)) {
    const g = groupOf(id);
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g)!.push(id);
  }

  return (
    <div>
      <style>{`
        @font-face {
          font-family: "Carlito";
          src: url("/dev/fonts/Carlito-Regular.ttf") format("truetype");
          font-weight: normal;
          font-style: normal;
        }
      `}</style>

      <div className="flex flex-wrap items-center gap-4 rounded-brand border border-border bg-surface/40 p-4">
        <label className="flex items-center gap-2 text-sm text-text-muted">
          Font size
          <input
            type="number"
            value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value) || 10)}
            className="w-16 rounded-brand border border-border bg-bg px-2 py-1 text-text"
            min={4}
            max={30}
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-text-muted">
          Font
          <select
            value={fontFamily}
            onChange={(e) => setFontFamily(e.target.value as typeof fontFamily)}
            className="rounded-brand border border-border bg-bg px-2 py-1 text-text"
          >
            <option value="Carlito">Carlito (production font)</option>
            <option value="Helvetica, Arial, sans-serif">Helvetica (for comparison)</option>
          </select>
        </label>
        <button
          type="button"
          onClick={resetToFileDefaults}
          title="Discard anything not yet applied and reload the values currently live in form-template.ts"
          className="ml-auto rounded-brand border border-border px-4 py-2 text-sm text-text-muted transition-colors hover:border-accent hover:text-text"
        >
          Reset to file defaults
        </button>
        <button
          type="button"
          onClick={handleCopy}
          className="rounded-brand bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
        >
          {copyStatus === "copied" ? "Copied!" : copyStatus === "failed" ? "Copy failed, see below" : "Copy config"}
        </button>
      </div>
      <p className="mt-2 text-xs text-text-muted">
        Every field&apos;s x/y is auto-saved in this browser as you work, so a refresh won&apos;t lose progress
        &mdash; but that&apos;s only a local cache. Applying a copied config to form-template.ts is the only real
        save.
      </p>

      {exportText && (
        <div className="mt-3">
          <textarea
            readOnly
            value={exportText}
            rows={12}
            className="w-full rounded-brand border border-border bg-bg p-3 font-mono text-xs text-text"
            onFocus={(e) => e.currentTarget.select()}
          />
        </div>
      )}

      <div className="mt-6 flex gap-6">
        <div
          ref={containerRef}
          className="relative shrink-0 select-none overflow-hidden rounded-brand border border-border"
          style={{ width: IMAGE_W_PX, height: IMAGE_H_PX }}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/dev/pdf-calibrator-template.png"
            alt="Blank template"
            width={IMAGE_W_PX}
            height={IMAGE_H_PX}
            className="pointer-events-none absolute left-0 top-0"
            draggable={false}
          />

          {Object.entries(fields).map(([id, f]) => {
            const left = ptToPx(f.x);
            const top = yPtToTopPx(f.y);
            const isSelected = id === selectedId;
            const ring = isSelected ? "outline outline-2 outline-red-500" : "outline outline-1 outline-blue-400/60";

            if (f.kind === "checkbox") {
              return (
                <div
                  key={id}
                  onPointerDown={onPointerDown(id)}
                  title={f.label}
                  className={`absolute flex cursor-move items-center justify-center bg-red-500/10 ${ring}`}
                  style={{
                    left,
                    top,
                    width: 24,
                    height: 24,
                    transform: "translate(-50%, -50%)",
                    fontSize,
                    fontFamily,
                    color: "red",
                    fontWeight: "bold",
                  }}
                >
                  X
                </div>
              );
            }

            if (f.kind === "text") {
              const baseFontSizePx = ptToPx(fontSize);
              const fieldKey = id.replace("textFields.", "");
              // Only shrink once hydrated: the server render can't measure text
              // (no `document`), so applying it on the first client render
              // too would make client and server HTML disagree and trip a
              // hydration mismatch.
              const fontSizePx =
                hydrated && f.sample ? fitFontSizePx(f.sample, fieldKey, baseFontSizePx, fontFamily) : baseFontSizePx;
              const shrunk = fontSizePx < baseFontSizePx - 0.01;
              return (
                <div
                  key={id}
                  onPointerDown={onPointerDown(id)}
                  title={shrunk ? `${f.label} (shrunk to fit — see title)` : f.label}
                  className={`absolute cursor-move whitespace-nowrap ${shrunk ? "bg-amber-500/15" : "bg-blue-500/10"} ${ring}`}
                  style={{
                    left,
                    top: top - fontSizePx,
                    height: fontSizePx,
                    lineHeight: `${fontSizePx}px`,
                    fontSize: fontSizePx,
                    fontFamily,
                    color: shrunk ? "#b45309" : "blue",
                  }}
                >
                  {f.sample}
                </div>
              );
            }

            // box (photo / signature). pdf-lib's drawImage treats (x,y) as
            // the BOTTOM-left corner and extends upward by `height` — so the
            // box's pixel-top edge is at y+height, not y. (Previously this
            // used `top` directly here, which put the overlay a full
            // `height` too low on screen relative to the real PDF output.)
            const widthPx = ptToPx(f.width ?? 0);
            const heightPx = ptToPx(f.height ?? 0);
            const boxTop = yPtToTopPx(f.y + (f.height ?? 0));
            return (
              <div
                key={id}
                onPointerDown={onPointerDown(id)}
                title={f.label}
                className={`absolute flex cursor-move items-center justify-center bg-green-500/10 text-[10px] text-green-700 ${ring}`}
                style={{ left, top: boxTop, width: widthPx, height: heightPx }}
              >
                {f.label}
              </div>
            );
          })}
        </div>

        <div className="min-w-0 flex-1 space-y-6 overflow-y-auto" style={{ maxHeight: IMAGE_H_PX }}>
          {GROUP_ORDER.map(([, groupLabel]) => {
            const ids = groups.get(groupLabel);
            if (!ids) return null;
            return (
              <section key={groupLabel}>
                <h2 className="font-heading text-sm text-text">{groupLabel}</h2>
                <div className="mt-2 space-y-2">
                  {ids.map((id) => {
                    const f = fields[id];
                    return (
                      <div
                        key={id}
                        onClick={() => setSelectedId(id)}
                        className={`cursor-pointer rounded-brand border p-2 text-xs ${
                          id === selectedId ? "border-accent bg-accent/10" : "border-border bg-surface/30"
                        }`}
                      >
                        <p className="mb-1.5 font-medium text-text">{f.label}</p>
                        <div className="flex flex-wrap items-center gap-2">
                          <label className="flex items-center gap-1 text-text-muted">
                            x
                            <input
                              type="number"
                              value={Math.round(f.x * 100) / 100}
                              onChange={(e) => updateField(id, { x: Number(e.target.value) })}
                              className="w-16 rounded border border-border bg-bg px-1 py-0.5 text-text"
                              step={0.1}
                            />
                          </label>
                          <label className="flex items-center gap-1 text-text-muted">
                            y
                            <input
                              type="number"
                              value={Math.round(f.y * 100) / 100}
                              onChange={(e) => updateField(id, { y: Number(e.target.value) })}
                              className="w-16 rounded border border-border bg-bg px-1 py-0.5 text-text"
                              step={0.1}
                            />
                          </label>
                          {f.kind === "box" && (
                            <>
                              <label className="flex items-center gap-1 text-text-muted">
                                w
                                <input
                                  type="number"
                                  value={Math.round((f.width ?? 0) * 100) / 100}
                                  onChange={(e) => updateField(id, { width: Number(e.target.value) })}
                                  className="w-16 rounded border border-border bg-bg px-1 py-0.5 text-text"
                                  step={0.1}
                                />
                              </label>
                              <label className="flex items-center gap-1 text-text-muted">
                                h
                                <input
                                  type="number"
                                  value={Math.round((f.height ?? 0) * 100) / 100}
                                  onChange={(e) => updateField(id, { height: Number(e.target.value) })}
                                  className="w-16 rounded border border-border bg-bg px-1 py-0.5 text-text"
                                  step={0.1}
                                />
                              </label>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
