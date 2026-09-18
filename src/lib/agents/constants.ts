export const ELECTION_TYPES = [
  "presidential",
  "governorship",
  "senatorial",
  "house_of_reps",
  "house_of_assembly",
] as const;
export type ElectionType = (typeof ELECTION_TYPES)[number];

export const ELECTION_TYPE_LABELS: Record<ElectionType, string> = {
  presidential: "Presidential",
  governorship: "Governorship",
  senatorial: "Senatorial",
  house_of_reps: "House of Representatives",
  house_of_assembly: "House of Assembly",
};

/** Every nomination authority in this build is Oyo State — there is no state column on agent_nominations. */
export const CONSTITUENCY_STATE = "Oyo State";
