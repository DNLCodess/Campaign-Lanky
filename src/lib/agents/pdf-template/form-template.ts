export const FORM_PAGE = { widthPt: 595.3, heightPt: 841.9 };

export const CHECKBOXES = {
  electionType: {
    presidential: { x: 196.3, y: 655.7 },
    governorship: { x: 275.0, y: 655.7 },
    senatorial: { x: 343.2, y: 655.7 },
    houseOfReps: { x: 433.9, y: 655.7 },
    houseOfAssembly: { x: 546.2, y: 655.7 },
  },
  agentFor: {
    pollingUnit: { x: 196.3, y: 638.9 },
    wardCollation: { x: 277.9, y: 638.9 },
    lgaCollation: { x: 353.3, y: 638.9 },
    stateCollation: { x: 438.7, y: 638.9 },
    nationalCollation: { x: 541.9, y: 638.9 },
    stateConstCollation: { x: 265.0, y: 624.0 },
    fedConstCollation: { x: 406.1, y: 624.0 },
    senDistCollation: { x: 541.4, y: 624.0 },
  },
  gender: {
    male: { x: 257.8, y: 501.1 },
    female: { x: 361.0, y: 501.1 },
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
