import "server-only";
import { randomInt } from "node:crypto";

const UPPERCASE = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // no I, O (look like 1, 0)
const LOWERCASE = "abcdefghjkmnpqrstuvwxyz"; // no i, l, o
const DIGITS = "23456789"; // no 0, 1
const SYMBOLS = "!@#$%^&*+-=?";
const ALL_CHARS = UPPERCASE + LOWERCASE + DIGITS + SYMBOLS;

function randomChar(charset: string): string {
  return charset[randomInt(charset.length)];
}

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Cryptographically random password: at least one of each character class. */
export function generateSecurePassword(length = 12): string {
  const required = [
    randomChar(UPPERCASE),
    randomChar(LOWERCASE),
    randomChar(DIGITS),
    randomChar(SYMBOLS),
  ];
  const rest = Array.from({ length: Math.max(0, length - required.length) }, () =>
    randomChar(ALL_CHARS),
  );
  return shuffle([...required, ...rest]).join("");
}
