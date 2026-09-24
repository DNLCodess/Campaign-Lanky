import "server-only";
import { PDFDocument } from "pdf-lib";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { generateNominationPdf, PDF_LAYOUT_VERSION } from "@/lib/agents/pdf-generate";
import { CONSTITUENCY_STATE, type ElectionType } from "@/lib/agents/constants";

type Admin = ReturnType<typeof createAdminSupabase>;

const BUCKET = "agent-nominations";

/**
 * A form PDF is a derived file, rendered once at submission. Every PDF now
 * carries PDF_LAYOUT_VERSION in its keywords; one without it was made before
 * the ID page was fitted to the form (and before photos were turned upright),
 * so it is rebuilt from the saved files.
 */
async function isStale(bytes: Uint8Array): Promise<boolean> {
  const doc = await PDFDocument.load(bytes, { updateMetadata: false });
  return !(doc.getKeywords() ?? "").includes(PDF_LAYOUT_VERSION);
}

async function download(admin: Admin, path: string): Promise<Uint8Array | null> {
  const { data } = await admin.storage.from(BUCKET).download(path);
  return data ? new Uint8Array(await data.arrayBuffer()) : null;
}

/** Rebuilds a nomination's form PDF from its saved data and files, overwriting the stored one. */
async function regenerate(admin: Admin, nominationId: string, pdfPath: string): Promise<Uint8Array | null> {
  const { data: n } = await admin
    .from("agent_nominations")
    .select(
      "candidate_id, form_no, first_name, other_names, surname, gender, phone, email, means_of_id, lga, ward, polling_unit_code, polling_unit_name, created_at",
    )
    .eq("id", nominationId)
    .maybeSingle();
  if (!n) return null;

  const [{ data: candidate }, { data: nominator }, { data: files }] = await Promise.all([
    admin.from("nomination_candidates").select("election_type").eq("id", n.candidate_id).maybeSingle(),
    admin.from("authorized_nominator").select("full_name, signature_storage_path").eq("id", true).maybeSingle(),
    admin.from("agent_nomination_files").select("file_type, storage_path").eq("nomination_id", nominationId),
  ]);
  if (!candidate || !nominator) return null;

  const pathOf = (type: string) => files?.find((f) => f.file_type === type)?.storage_path;
  const pvcPath = pathOf("pvc_copy");
  const photoPath = pathOf("passport_photo");
  const signaturePath = pathOf("specimen_signature");
  if (!pvcPath || !photoPath || !signaturePath) return null;

  const [pvc, photo, signature, nominatorSignature] = await Promise.all([
    download(admin, pvcPath),
    download(admin, photoPath),
    download(admin, signaturePath),
    download(admin, nominator.signature_storage_path),
  ]);
  if (!pvc || !photo || !signature || !nominatorSignature) return null;

  const ext = pvcPath.split(".").pop();
  const bytes = await generateNominationPdf({
    electionType: candidate.election_type as ElectionType,
    formNo: n.form_no,
    firstName: n.first_name,
    otherNames: n.other_names ?? "",
    surname: n.surname,
    gender: n.gender,
    phone: n.phone,
    email: n.email ?? "",
    meansOfId: n.means_of_id,
    state: CONSTITUENCY_STATE,
    lga: n.lga,
    ward: n.ward,
    pollingUnitCode: n.polling_unit_code,
    pollingUnitName: n.polling_unit_name,
    photoBytes: photo,
    signatureBytes: signature,
    idFileBytes: pvc,
    idFileContentType: ext === "pdf" ? "application/pdf" : ext === "png" ? "image/png" : "image/jpeg",
    authorizedNominatorName: nominator.full_name,
    authorizedNominatorSignatureBytes: nominatorSignature,
    submissionDate: new Date(n.created_at),
  });

  const { error } = await admin.storage
    .from(BUCKET)
    .upload(pdfPath, bytes, { contentType: "application/pdf", upsert: true });
  if (error) console.error("[agents] could not save regenerated PDF for", nominationId, error);
  return bytes;
}

/**
 * Returns the up-to-date form PDF for a nomination, repairing the stored one
 * first if it predates the current layout. Returns null if there is no stored
 * PDF or it can't be rebuilt — callers keep whatever they had.
 */
export async function getCurrentNominationPdf(
  admin: Admin,
  nominationId: string,
  pdfPath: string,
): Promise<Uint8Array | null> {
  const stored = await download(admin, pdfPath);
  if (!stored) return null;
  try {
    if (!(await isStale(stored))) return stored;
    return (await regenerate(admin, nominationId, pdfPath)) ?? stored;
  } catch (err) {
    console.error("[agents] PDF freshness check failed for", nominationId, err);
    return stored;
  }
}

/** Repairs the stored PDF in place if stale (used before handing out a signed URL). */
export async function ensureCurrentNominationPdf(nominationId: string): Promise<void> {
  const admin = createAdminSupabase();
  const { data: row } = await admin
    .from("agent_nomination_files")
    .select("storage_path")
    .eq("nomination_id", nominationId)
    .eq("file_type", "generated_pdf")
    .maybeSingle();
  if (row) await getCurrentNominationPdf(admin, nominationId, row.storage_path);
}
