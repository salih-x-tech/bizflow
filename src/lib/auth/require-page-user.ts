import "server-only";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session-config";
import { AppError } from "@/lib/errors";
import { requireUser } from "@/lib/auth/require-user";

export async function requirePageUser() {
  try {
    return await requireUser();
  } catch (error: unknown) {
    if (
      error instanceof AppError &&
      error.code === "UNAUTHENTICATED"
    ) {
      const hadSession = (await cookies()).has(SESSION_COOKIE_NAME);
      redirect(hadSession ? "/login?reason=session" : "/login");
    }

    throw error;
  }
}
