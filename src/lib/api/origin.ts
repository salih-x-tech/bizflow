import "server-only";
import { AppError } from "@/lib/errors";

export function assertTrustedOrigin(request: Request): void {
  const appUrl = process.env.APP_URL;

  if (!appUrl) {
    throw new Error("APP_URL is missing from the environment.");
  }

  const trustedOrigin = new URL(appUrl).origin;
  const requestOrigin = request.headers.get("origin");

  if (
    requestOrigin !== trustedOrigin ||
    request.headers.get("sec-fetch-site") === "cross-site"
  ) {
    throw new AppError(
      "UNTRUSTED_ORIGIN",
      "This request is not allowed.",
      403,
    );
  }
}