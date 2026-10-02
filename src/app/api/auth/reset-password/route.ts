import { cookies } from "next/headers";
import { assertTrustedOrigin } from "@/lib/api/origin";
import { readJsonBody } from "@/lib/api/request";
import { apiError, apiSuccess } from "@/lib/api/response";
import { consumeRateLimit } from "@/lib/auth/rate-limit";
import {
  getSessionCookieOptions,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session-config";
import { resetPassword } from "@/services/auth/reset-password.service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    assertTrustedOrigin(request);

    await consumeRateLimit({
      scope: "auth:reset-password:global",
      identifier: "all",
      limit: 100,
      windowMs: 60 * 1000,
    });

    const input = await readJsonBody(request);
    await resetPassword(input);

    const cookieStore = await cookies();

    cookieStore.set(SESSION_COOKIE_NAME, "", {
      ...getSessionCookieOptions(new Date(0)),
      maxAge: 0,
    });

    return apiSuccess({
      message: "Password reset successfully. Please log in again.",
    });
  } catch (error: unknown) {
    return apiError(error);
  }
}