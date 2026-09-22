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
 */

import { useCallback, useRef, useState } from "react";

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
  "checkboxes.agentFor.lgaCollation": { kind: "checkbox", label: "Agent for: LGA Collation", x: 349.2, y: 639.9 },
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

  "textFields.formNo": { kind: "text", label: "Form No.", sample: "9", x: 487.8, y: 601.1 },
  "textFields.firstName": { kind: "text", label: "First Name", sample: "Test Nom", x: 150.4, y: 568.5 },
  "textFields.otherNames": { kind: "text", label: "Other Names", sample: "Middle", x: 150.4, y: 544.5 },
  "textFields.surname": { kind: "text", label: "Surname", sample: "Surname", x: 150.4, y: 520.5 },
  "textFields.phoneNumber": { kind: "text", label: "Phone Number", sample: "08012345678", x: 150.4, y: 462.9 },
  "textFields.emailAddress": {
    kind: "text",
    label: "Email Address",
    sample: "testnom@gmail.com",
    x: 150.4,
    y: 438.9,
  },
  "textFields.meansOfId": { kind: "text", label: "Means of ID", sample: "PVC", x: 152.8, y: 395.7 },
  "textFields.state": { kind: "text", label: "State", sample: "Oyo State", x: 104.4, y: 308.3 },
  "textFields.lga": { kind: "text", label: "LGA", sample: "Ibadan North-West", x: 319.4, y: 308.3 },
  "textFields.registrationArea": { kind: "text", label: "Registration Area", sample: "7", x: 176.8, y: 285.3 },
  "textFields.pollingUnitCode": {
    kind: "text",
    label: "Polling Unit Code",
    sample: "30-08-07-007",
    x: 176.8,
    y: 260.3,
  },
  "textFields.pollingUnitName": {
    kind: "text",
    label: "Polling Unit Name",
    sample: "IN FRONT OF QUEENS CINEMA, EKOTEDO I",
    x: 176.8,
    y: 237.3,
  },
  "textFields.collationAgentDetail": {
    kind: "text",
    label: "For Collation Agents (box)",
    sample: "Polling Unit",
    x: 350,
    y: 210,
  },
  "textFields.attestationName": {
    kind: "text",
    label: "Attestation Name",
    sample: "Test Nom Surname",
    x: 103.4,
    y: 153.3,
  },
  "textFields.attestationDate": {
    kind: "text",
    label: "Attestation Date",
    sample: "22/09/2026",
    x: 415.4,
    y: 128.3,
  },
  "textFields.authorisedNominatorName": {
    kind: "text",
    label: "Authorised Nominator Name",
    sample: "Atayese Tunji Sadiq (FCA)",
    x: 103.4,
    y: 57.3,
  },
  "textFields.authorisedNominatorDate": {
    kind: "text",
    label: "Authorised Nominator Date",
    sample: "22/09/2026",
    x: 415.4,
    y: 32.3,
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
    x: 98.4,
    y: 15.3,
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

export function PdfCalibrator() {
  const [fields, setFields] = useState<Record<string, FieldState>>(INITIAL_FIELDS);
  const [fontSize, setFontSize] = useState(10);
  const [fontFamily, setFontFamily] = useState<"Carlito" | "Helvetica, Arial, sans-serif">("Carlito");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">("idle");
  const [exportText, setExportText] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ id: string; startPx: number; startPy: number; origX: number; origY: number } | null>(
    null,
  );

  const updateField = useCallback((id: string, patch: Partial<FieldState>) => {
    setFields((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
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
          onClick={handleCopy}
          className="ml-auto rounded-brand bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
        >
          {copyStatus === "copied" ? "Copied!" : copyStatus === "failed" ? "Copy failed, see below" : "Copy config"}
        </button>
      </div>

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
              const fontSizePx = ptToPx(fontSize);
              return (
                <div
                  key={id}
                  onPointerDown={onPointerDown(id)}
                  title={f.label}
                  className={`absolute cursor-move whitespace-nowrap bg-blue-500/10 ${ring}`}
                  style={{
                    left,
                    top: top - fontSizePx,
                    height: fontSizePx,
                    lineHeight: `${fontSizePx}px`,
                    fontSize: fontSizePx,
                    fontFamily,
                    color: "blue",
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
