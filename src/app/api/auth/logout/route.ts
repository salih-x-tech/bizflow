import { cookies } from "next/headers";
import { assertTrustedOrigin } from "@/lib/api/origin";
import { apiError, apiSuccess } from "@/lib/api/response";
import {
  getSessionCookieOptions,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session-config";
import { logoutUser } from "@/services/auth/logout.service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    assertTrustedOrigin(request);

    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    await logoutUser(token);

    cookieStore.set(SESSION_COOKIE_NAME, "", {
      ...getSessionCookieOptions(new Date(0)),
      maxAge: 0,
    });

    return apiSuccess({
      message: "Logged out successfully.",
    });
  } catch (error: unknown) {
    return apiError(error);
  }
}