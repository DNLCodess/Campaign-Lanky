export const PHONE_REGEX = /^(?:\+234|0)\d{10}$/;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_PVC_TYPES = ["image/jpeg", "image/png", "application/pdf"];
export const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png"];

// Generous enough for any real name/email (the longest real polling unit
// name in constituency_geo is 90 chars, for comparison) while ruling out the
// pathological case pdf-generate.ts's shrink-to-fit can't fully protect
// against: a value so long that even its 6pt legibility floor still
// overflows the printed box. Nothing server-controlled (like a polling unit
// name, sourced from constituency_geo) needs this — only fields the nominee
// free-types.
export const MAX_NAME_LENGTH = 50;
export const MAX_EMAIL_LENGTH = 100;
// generateNominationPdf draws firstName+otherNames+surname joined as ONE
// attestation-name value (see fullName there) — three individually-capped
// fields can still combine past what that box's shrink-to-fit floor can
// save (verified: at this field's 300pt box width, ~85 chars is where even
// the 6pt floor stops being enough). Bounded well under that so the floor
// is never actually reached. Checked against the exact same join.
export const MAX_FULL_NAME_LENGTH = 80;

export function isValidPhone(phone: string): boolean {
  return PHONE_REGEX.test(phone.trim());
}

/** Email is optional on the official form — an empty value is valid. */
export function isValidEmail(email: string): boolean {
  const trimmed = email.trim();
  if (!trimmed) return true;
  return EMAIL_REGEX.test(trimmed);
}

export function isValidFile(file: File, allowedTypes: string[]): boolean {
  return file.size > 0 && file.size <= MAX_FILE_SIZE && allowedTypes.includes(file.type);
}
