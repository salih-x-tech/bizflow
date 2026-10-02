import { cookies } from "next/headers";
import { assertTrustedOrigin } from "@/lib/api/origin";
import { readJsonBody } from "@/lib/api/request";
import { apiError, apiSuccess } from "@/lib/api/response";
import { consumeRateLimit } from "@/lib/auth/rate-limit";
import {
  getSessionCookieOptions,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session-config";
import { loginUser } from "@/services/auth/login.service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    assertTrustedOrigin(request);

    await consumeRateLimit({
      scope: "auth:login:global",
      identifier: "all",
      limit: 100,
      windowMs: 60 * 1000,
    });

    const input = await readJsonBody(request);
    const result = await loginUser(input);

    const cookieStore = await cookies();

    cookieStore.set(
      SESSION_COOKIE_NAME,
      result.session.token,
      getSessionCookieOptions(result.session.expiresAt),
    );

    return apiSuccess({
      user: result.user,
    });
  } catch (error: unknown) {
    return apiError(error);
  }
}