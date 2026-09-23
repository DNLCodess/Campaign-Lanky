export const FORM_PAGE = { widthPt: 595.3, heightPt: 841.9 };

// Every checkbox coordinate below is the checkbox square's own center,
// re-measured directly off the blank template via connected-component
// detection (each box's actual pixel bounding box, converted back to PDF
// points) rather than hand-estimated. Paired with pdf-generate.ts's check()
// centering the "X" glyph on that point (not drawing it baseline-left from
// it), the mark lands inside the box instead of floating above-right of it.
export const CHECKBOXES = {
  electionType: {
    presidential: { x: 193.5, y: 654.9 },
    governorship: { x: 272.3, y: 654.9 },
    senatorial: { x: 343.3, y: 654.9 },
    houseOfReps: { x: 433.1, y: 654.9 },
    houseOfAssembly: { x: 545.8, y: 654.9 },
  },
  agentFor: {
    pollingUnit: { x: 193.5, y: 639.9 },
    wardCollation: { x: 278.1, y: 639.9 },
    lgaCollation: { x: 353.14, y: 640.64 },
    stateCollation: { x: 439.0, y: 639.9 },
    nationalCollation: { x: 536.6, y: 639.9 },
    stateConstCollation: { x: 264.6, y: 624.5 },
    fedConstCollation: { x: 406.4, y: 624.5 },
    senDistCollation: { x: 540.9, y: 624.5 },
  },
  gender: {
    male: { x: 258.8, y: 501.0 },
    female: { x: 363.1, y: 501.0 },
  },
} as const;

export const TEXT_FIELDS = {
  formNo: { x: 487.8, y: 601.1 },
  firstName: { x: 150.4, y: 568.5 },
  otherNames: { x: 150.4, y: 544.5 },
  surname: { x: 150.4, y: 520.5 },
  phoneNumber: { x: 150.4, y: 459.88 },
  emailAddress: { x: 148.81, y: 433.12 },
  meansOfId: { x: 152.8, y: 395.7 },
  state: { x: 104.4, y: 308.3 },
  lga: { x: 326.02, y: 305.99 },
  registrationArea: { x: 177.49, y: 282.06 },
  pollingUnitCode: { x: 177.29, y: 256.55 },
  pollingUnitName: { x: 176.07, y: 234.55 },
  // The template's "For Collation Agents (Please indicate: Ward/LGA/...)"
  // box — this platform only nominates Polling Unit Agents, so
  // pdf-generate.ts writes "Ward <n>" here (the nominee's own ward), since
  // "Polling Unit" itself isn't one of the instruction's listed values.
  // Position is an initial guess pending calibration — nudge it via the PDF
  // calibrator dev tool.
  collationAgentDetail: { x: 350, y: 210 },
  attestationName: { x: 103.4, y: 153.3 },
  attestationDate: { x: 415.4, y: 123.24 },
  authorisedNominatorName: { x: 103.18, y: 65.74 },
  authorisedNominatorDate: { x: 415.51, y: 36.74 },
} as const;

// The printed box width (pt) each value must stay inside, for pdf-generate.ts's
// shrink-to-fit. Single source of truth: the PDF calibrator dev tool reads
// this too, so its preview shrinks long values the same way the real PDF
// does instead of just showing them overflow. A field with no entry here is
// short/bounded enough (a date, a ward number, a dropdown value) that it
// never needs shrinking.
export const TEXT_FIELD_MAX_WIDTHS: Partial<Record<keyof typeof TEXT_FIELDS, number>> = {
  firstName: 295,
  otherNames: 295,
  surname: 295,
  phoneNumber: 400,
  emailAddress: 400,
  meansOfId: 400,
  state: 180,
  lga: 250,
  pollingUnitCode: 250,
  pollingUnitName: 400,
  attestationName: 300,
  authorisedNominatorName: 300,
};

export const PHOTO_BOX = { x: 459.8, y: 484.3, width: 93.1, height: 100.8 } as const;

export const SIGNATURE_BOXES = {
  specimen: { x: 147.8, y: 347.5, width: 281.8, height: 21.6 },
  attestation: { x: 98.4, y: 111.3, width: 223.2, height: 25.9 },
  authorisedNominator: { x: 97.79, y: 18.28, width: 223.2, height: 25.9 },
} as const;
