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
    lgaCollation: { x: 349.2, y: 639.9 },
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
  phoneNumber: { x: 150.4, y: 462.9 },
  emailAddress: { x: 150.4, y: 438.9 },
  meansOfId: { x: 152.8, y: 395.7 },
  state: { x: 104.4, y: 308.3 },
  lga: { x: 319.4, y: 308.3 },
  registrationArea: { x: 176.8, y: 285.3 },
  pollingUnitCode: { x: 176.8, y: 260.3 },
  pollingUnitName: { x: 176.8, y: 237.3 },
  attestationName: { x: 103.4, y: 153.3 },
  attestationDate: { x: 415.4, y: 128.3 },
  authorisedNominatorName: { x: 103.4, y: 57.3 },
  authorisedNominatorDate: { x: 415.4, y: 32.3 },
} as const;

export const PHOTO_BOX = { x: 459.8, y: 484.3, width: 93.1, height: 100.8 } as const;

export const SIGNATURE_BOXES = {
  specimen: { x: 147.8, y: 347.5, width: 281.8, height: 21.6 },
  attestation: { x: 98.4, y: 111.3, width: 223.2, height: 25.9 },
  authorisedNominator: { x: 98.4, y: 15.3, width: 223.2, height: 25.9 },
} as const;
