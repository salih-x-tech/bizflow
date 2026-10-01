import "server-only";
import { connectDB } from "@/lib/db/connect";
import { hashPassword } from "@/lib/auth/password";
import { consumeRateLimit } from "@/lib/auth/rate-limit";
import { registerSchema } from "@/lib/validation/auth";
import { AppError } from "@/lib/errors";
import { User } from "@/models/User";
import { AuditLog } from "@/models/AuditLog";

function duplicateEmailError() {
  return new AppError(
    "EMAIL_ALREADY_EXISTS",
    "An account with this email already exists.",
    409,
    [{ field: "email", issue: "Use another email or log in." }],
  );
}

export async function registerUser(input: unknown) {
  const data = registerSchema.parse(input);

  await consumeRateLimit({
    scope: "auth:register:email",
    identifier: data.email,
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });

  const connection = await connectDB();
  await User.init();
  await AuditLog.init();

  const existingUser = await User.exists({ email: data.email });

  if (existingUser) {
    throw duplicateEmailError();
  }

  const passwordHash = await hashPassword(data.password);

  try {
    return await connection.connection.transaction(
      async (databaseSession) => {
        const [user] = await User.create(
          [
            {
              name: data.name,
              email: data.email,
              passwordHash,
              status: "Active",
            },
          ],
          { session: databaseSession },
        );

        if (!user) {
          throw new Error("User creation failed.");
        }

        await AuditLog.create(
          [
            {
              scope: "Account",
              userId: user._id,
              action: "USER_REGISTERED",
              entityType: "User",
              entityId: user._id,
              details: {},
            },
          ],
          { session: databaseSession },
        );

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
        };
      },
      { readPreference: "primary" },
    );
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    ) {
      throw duplicateEmailError();
    }

    throw error;
  }
}