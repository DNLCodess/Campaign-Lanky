export const PHONE_REGEX = /^(?:\+234|0)\d{10}$/;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_PVC_TYPES = ["image/jpeg", "image/png", "application/pdf"];
export const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png"];

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
