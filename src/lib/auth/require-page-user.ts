import "server-only";
import { redirect } from "next/navigation";
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
      redirect("/login");
    }

    throw error;
  }
}