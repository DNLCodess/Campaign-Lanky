"use server";

import { randomInt, randomUUID } from "node:crypto";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { generateNominationPdf } from "@/lib/agents/pdf-generate";
import {
  ALLOWED_PHOTO_TYPES,
  ALLOWED_PVC_TYPES,
  isValidEmail,
  isValidFile,
  isValidPhone,
} from "@/lib/agents/validation";
import { CONSTITUENCY_STATE, type ElectionType } from "@/lib/agents/constants";

export type SubmitNominationState = { error?: string; referenceId?: string };

const REF_ID_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I ambiguity

function generateReferenceId(): string {
  return Array.from({ length: 8 }, () => REF_ID_CHARS[randomInt(REF_ID_CHARS.length)]).join("");
}

const GENERIC_ERROR = "Something went wrong. Please try again.";

export async function submitNomination(
  _prev: SubmitNominationState,
  formData: FormData,
): Promise<SubmitNominationState> {
  // Honeypot: real users never see or fill this field (PRD §8 bot protection).
  if (String(formData.get("website") ?? "").trim()) {
    return { error: GENERIC_ERROR };
  }

  const slug = String(formData.get("slug") ?? "").trim();
  if (!slug) return { error: "Missing link identifier." };

  const admin = createAdminSupabase();
  const { data: authority } = await admin
    .from("nomination_authorities")
    .select("id, full_name, election_type, signature_storage_path, is_active")
    .eq("slug", slug)
    .maybeSingle();
  if (!authority || !authority.is_active) {
    return { error: "This link is no longer active. Contact the person who shared it with you." };
  }
  if (!authority.signature_storage_path) {
    return { error: "This authority has no signature on file yet. Contact them directly." };
  }

  const firstName = String(formData.get("first_name") ?? "").trim();
  const otherNames = String(formData.get("other_names") ?? "").trim();
  const surname = String(formData.get("surname") ?? "").trim();
  const gender = String(formData.get("gender") ?? "");
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const meansOfId = String(formData.get("means_of_id") ?? "").trim() || "PVC";
  const lga = String(formData.get("lga") ?? "").trim();
  const ward = Number(formData.get("ward"));
  const pollingUnitCode = String(formData.get("polling_unit_code") ?? "").trim();
  const pollingUnitName = String(formData.get("polling_unit_name") ?? "").trim();
  const attested = formData.get("attested") === "true";
  const pvcFile = formData.get("pvc_file");
  const photoFile = formData.get("photo_file");
  const signatureFile = formData.get("signature_file");

  if (!firstName || !surname) return { error: "First name and surname are required." };
  if (gender !== "male" && gender !== "female") return { error: "Select a gender." };
  if (!isValidPhone(phone)) return { error: "Enter a valid Nigerian phone number." };
  if (!isValidEmail(email)) return { error: "Enter a valid email address." };
  if (!lga) return { error: "Select an LGA." };
  if (!ward || ward < 1) return { error: "Select a ward." };
  if (!pollingUnitCode || !pollingUnitName) return { error: "Select a polling unit." };
  if (!attested) return { error: "You must confirm the attestation to submit." };
  if (!(pvcFile instanceof File) || !isValidFile(pvcFile, ALLOWED_PVC_TYPES)) {
    return { error: "Upload a valid PVC copy (JPEG, PNG, or PDF, under 5MB)." };
  }
  if (!(photoFile instanceof File) || !isValidFile(photoFile, ALLOWED_PHOTO_TYPES)) {
    return { error: "Upload a valid passport photo (JPEG or PNG, under 5MB)." };
  }
  if (!(signatureFile instanceof File) || signatureFile.size === 0) {
    return { error: "A signature is required." };
  }

  const { data: pu } = await admin
    .from("constituency_geo")
    .select("lga, ward, pu_code, pu_name")
    .eq("pu_code", pollingUnitCode)
    .maybeSingle();
  if (!pu || pu.lga !== lga || pu.ward !== ward || pu.pu_name !== pollingUnitName) {
    return { error: "Selected polling unit does not match the chosen LGA/ward." };
  }

  const { data: existingMatches } = await admin
    .from("agent_nominations")
    .select("id")
    .eq("authority_id", authority.id)
    .or(`phone.eq.${phone}${email ? `,email.eq.${email}` : ""}`);
  const isPossibleDuplicate = (existingMatches?.length ?? 0) > 0;

  const nominationId = randomUUID();
  const [pvcBytes, photoBytes, signatureBytes] = await Promise.all([
    pvcFile.arrayBuffer().then((b) => new Uint8Array(b)),
    photoFile.arrayBuffer().then((b) => new Uint8Array(b)),
    signatureFile.arrayBuffer().then((b) => new Uint8Array(b)),
  ]);

  const pvcExt = pvcFile.type === "application/pdf" ? "pdf" : pvcFile.type === "image/png" ? "png" : "jpg";
  const photoExt = photoFile.type === "image/png" ? "png" : "jpg";
  const pvcPath = `nominations/${nominationId}/pvc.${pvcExt}`;
  const photoPath = `nominations/${nominationId}/photo.${photoExt}`;
  const signaturePath = `nominations/${nominationId}/signature.png`;

  const uploadResults = await Promise.all([
    admin.storage.from("agent-nominations").upload(pvcPath, pvcBytes, { contentType: pvcFile.type, upsert: false }),
    admin.storage.from("agent-nominations").upload(photoPath, photoBytes, { contentType: photoFile.type, upsert: false }),
    admin.storage.from("agent-nominations").upload(signaturePath, signatureBytes, { contentType: "image/png", upsert: false }),
  ]);
  if (uploadResults.some((r) => r.error)) {
    await admin.storage.from("agent-nominations").remove([pvcPath, photoPath, signaturePath]);
    return { error: "Failed to upload your files. Please try again." };
  }

  const authorityId = authority.id;

  async function tryInsert(refId: string) {
    return admin
      .from("agent_nominations")
      .insert({
        id: nominationId,
        authority_id: authorityId,
        first_name: firstName,
        other_names: otherNames || null,
        surname,
        gender,
        phone,
        email: email || null,
        means_of_id: meansOfId,
        lga,
        ward,
        polling_unit_code: pollingUnitCode,
        polling_unit_name: pollingUnitName,
        reference_id: refId,
        status: isPossibleDuplicate ? "flagged" : "submitted",
        is_possible_duplicate: isPossibleDuplicate,
      })
      .select("id, form_no")
      .single();
  }

  let referenceId = generateReferenceId();
  let insertResult = await tryInsert(referenceId);
  if (insertResult.error?.code === "23505") {
    referenceId = generateReferenceId();
    insertResult = await tryInsert(referenceId);
  }
  if (insertResult.error || !insertResult.data) {
    await admin.storage.from("agent-nominations").remove([pvcPath, photoPath, signaturePath]);
    return { error: "Failed to save your submission. Please try again." };
  }
  const insertedId = insertResult.data.id;
  const formNo = insertResult.data.form_no;

  let pdfBytes: Uint8Array;
  try {
    pdfBytes = await generateNominationPdf({
      electionType: authority.election_type as ElectionType,
      formNo,
      firstName,
      otherNames,
      surname,
      gender: gender as "male" | "female",
      phone,
      email,
      meansOfId,
      state: CONSTITUENCY_STATE,
      lga,
      ward,
      pollingUnitCode,
      pollingUnitName,
      photoBytes,
      signatureBytes,
      authorityName: authority.full_name,
      authoritySignatureBytes: await downloadAuthoritySignature(admin, authority.signature_storage_path),
      submissionDate: new Date(),
    });
  } catch (err) {
    console.error("[agents] PDF generation failed for nomination", insertedId, err);
    // The nomination row and source files are already saved; only the
    // rendered PDF is missing. Not rolled back — losing an already-successful
    // submission would be worse than a PDF that can be regenerated later.
    await admin.from("agent_nomination_files").insert([
      { nomination_id: insertedId, file_type: "pvc_copy", storage_path: pvcPath },
      { nomination_id: insertedId, file_type: "passport_photo", storage_path: photoPath },
      { nomination_id: insertedId, file_type: "specimen_signature", storage_path: signaturePath },
    ]);
    return { referenceId };
  }

  const pdfPath = `nominations/${insertedId}/form.pdf`;
  const { error: pdfUploadError } = await admin.storage
    .from("agent-nominations")
    .upload(pdfPath, pdfBytes, { contentType: "application/pdf", upsert: false });

  const fileRows = [
    { nomination_id: insertedId, file_type: "pvc_copy", storage_path: pvcPath },
    { nomination_id: insertedId, file_type: "passport_photo", storage_path: photoPath },
    { nomination_id: insertedId, file_type: "specimen_signature", storage_path: signaturePath },
  ];
  if (!pdfUploadError) {
    fileRows.push({ nomination_id: insertedId, file_type: "generated_pdf", storage_path: pdfPath });
  }
  await admin.from("agent_nomination_files").insert(fileRows);

  return { referenceId };
}

async function downloadAuthoritySignature(
  admin: ReturnType<typeof createAdminSupabase>,
  storagePath: string,
): Promise<Uint8Array> {
  const { data, error } = await admin.storage.from("agent-nominations").download(storagePath);
  if (error || !data) throw new Error("Could not load authority signature");
  return new Uint8Array(await data.arrayBuffer());
}
