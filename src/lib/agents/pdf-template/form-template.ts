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
    lgaCollation: { x: 353.57, y: 639.96 },
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
  formNo: { x: 513.7, y: 601.18 },
  firstName: { x: 150.4, y: 568.5 },
  otherNames: { x: 150.4, y: 544.5 },
  surname: { x: 150.4, y: 520.5 },
  phoneNumber: { x: 151.64, y: 457.21 },
  emailAddress: { x: 152.48, y: 432 },
  meansOfId: { x: 152.8, y: 395.7 },
  state: { x: 109.1, y: 304.97 },
  lga: { x: 334.73, y: 304.09 },
  registrationArea: { x: 198.85, y: 281.39 },
  pollingUnitCode: { x: 180.9, y: 258.17 },
  pollingUnitName: { x: 179.95, y: 233.18 },
  // The template's "For Collation Agents (Please indicate: Ward/LGA/...)"
  // box — this platform only nominates Polling Unit Agents, so
  // pdf-generate.ts always writes "Polling Unit" here, mirroring the
  // always-checked agentFor.pollingUnit checkbox. Position is an initial
  // guess pending calibration — nudge it via the PDF calibrator dev tool.
  collationAgentDetail: { x: 350, y: 210 },
  attestationName: { x: 113.74, y: 149.27 },
  attestationDate: { x: 451.83, y: 123.27 },
  authorisedNominatorName: { x: 114.03, y: 64.57 },
  authorisedNominatorDate: { x: 453.24, y: 36.47 },
} as const;

export const PHOTO_BOX = { x: 459.8, y: 484.3, width: 93.1, height: 100.8 } as const;

export const SIGNATURE_BOXES = {
  specimen: { x: 147.8, y: 347.5, width: 281.8, height: 21.6 },
  attestation: { x: 98.4, y: 111.3, width: 223.2, height: 25.9 },
  authorisedNominator: { x: 98.4, y: 15.3, width: 223.2, height: 25.9 },
} as const;
