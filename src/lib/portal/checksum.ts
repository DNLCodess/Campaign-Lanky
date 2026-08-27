import "server-only";
import { createHash } from "node:crypto";

/** SHA-256 tamper-detection checksum for one result row. */
export function computeResultChecksum(input: {
  electionId: string;
  candidateId: string;
  lga: string;
  ward: number;
  pollingUnit: string;
  votesCast: number;
  accreditedVoters: number;
  registeredVoters: number;
}): string {
  const canonical = [
    input.electionId,
    input.candidateId,
    input.lga.trim().toLowerCase(),
    String(input.ward),
    input.pollingUnit.trim().toLowerCase(),
    String(input.votesCast),
    String(input.accreditedVoters),
    String(input.registeredVoters),
  ].join("|");

  return createHash("sha256").update(canonical, "utf8").digest("hex");
}
