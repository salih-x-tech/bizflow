import "server-only";

export const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

export const SESSION_COOKIE_NAME =
  process.env.NODE_ENV === "production"
    ? "__Host-bizflow_session"
    : "bizflow_session";

export function getSessionCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    expires: expiresAt,
  };
}