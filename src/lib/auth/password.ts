import "server-only";
import { compare, hash, truncates } from "bcryptjs";

export const MIN_PASSWORD_LENGTH = 12;
export const MAX_PASSWORD_BYTES = 72;

const BCRYPT_COST = 12;

export async function hashPassword(password: string): Promise<string> {
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(
      `Password must contain at least ${MIN_PASSWORD_LENGTH} characters.`,
    );
  }

  if (truncates(password)) {
    throw new Error(
      `Password must not exceed ${MAX_PASSWORD_BYTES} UTF-8 bytes.`,
    );
  }

  return hash(password, BCRYPT_COST);
}

export async function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  if (truncates(password)) {
    return false;
  }

  return compare(password, passwordHash);
}