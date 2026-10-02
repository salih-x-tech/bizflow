import { cookies } from "next/headers";
import { apiError, apiSuccess } from "@/lib/api/response";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session-config";
import { AppError } from "@/lib/errors";
import { getSession } from "@/services/auth/session.service";

export const runtime = "nodejs";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    const session = await getSession(token);

    if (!session) {
      throw new AppError(
        "UNAUTHENTICATED",
        "Please log in to continue.",
        401,
      );
    }

    return apiSuccess({
      user: session.user,
    });
  } catch (error: unknown) {
    return apiError(error);
  }
}