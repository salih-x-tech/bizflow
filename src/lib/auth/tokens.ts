import "server-only";
import { createHash, randomBytes } from "node:crypto";

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function createAuthToken(): {
  token: string;
  tokenHash: string;
} {
  const token = randomBytes(32).toString("base64url");

  return {
    token,
    tokenHash: hashToken(token),
  };
}

export function isValidAuthToken(token: string): boolean {
  return /^[A-Za-z0-9_-]{43}$/.test(token);
}