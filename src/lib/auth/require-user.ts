import "server-only";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session-config";
import { AppError } from "@/lib/errors";
import { getSession } from "@/services/auth/session.service";

export async function requireUser() {
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

  return session.user;
}