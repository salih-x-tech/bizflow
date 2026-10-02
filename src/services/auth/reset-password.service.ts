import "server-only";
import { connectDB } from "@/lib/db/connect";
import { hashPassword } from "@/lib/auth/password";
import { consumeRateLimit } from "@/lib/auth/rate-limit";
import { hashToken } from "@/lib/auth/tokens";
import { AppError } from "@/lib/errors";
import { resetPasswordSchema } from "@/lib/validation/password-reset";
import { AuditLog } from "@/models/AuditLog";
import { PasswordResetToken } from "@/models/PasswordResetToken";
import { User } from "@/models/User";
import { revokeAllUserSessions } from "@/services/auth/session.service";

function invalidResetToken(): AppError {
  return new AppError(
    "INVALID_RESET_TOKEN",
    "This password-reset link is invalid or has expired.",
    400,
  );
}

export async function resetPassword(input: unknown): Promise<void> {
  const data = resetPasswordSchema.parse(input);
  const tokenHash = hashToken(data.token);

  await consumeRateLimit({
    scope: "auth:reset-password:token",
    identifier: tokenHash,
    limit: 5,
    windowMs: 15 * 60 * 1000,
  });

  const connection = await connectDB();
  await AuditLog.init();

  const passwordHash = await hashPassword(data.password);

  await connection.connection.transaction(
    async (databaseSession) => {
      const now = new Date();

      const resetToken = await PasswordResetToken.findOneAndUpdate(
        {
          tokenHash,
          usedAt: null,
          expiresAt: { $gt: now },
        },
        {
          $set: { usedAt: now },
        },
        {
          session: databaseSession,
          returnDocument: "before",
        },
      ).select("_id userId");

      if (!resetToken) {
        throw invalidResetToken();
      }

      const user = await User.findOneAndUpdate(
        {
          _id: resetToken.userId,
          status: "Active",
        },
        {
          $set: { passwordHash },
        },
        {
          session: databaseSession,
          returnDocument: "after",
          runValidators: true,
        },
      ).select("_id");

      if (!user) {
        throw invalidResetToken();
      }

      await PasswordResetToken.updateMany(
        {
          userId: user._id,
          usedAt: null,
        },
        {
          $set: { usedAt: now },
        },
        {
          session: databaseSession,
        },
      );

      await revokeAllUserSessions(user._id, databaseSession);

      await AuditLog.create(
        [
          {
            scope: "Account",
            userId: user._id,
            action: "PASSWORD_RESET",
            entityType: "User",
            entityId: user._id,
            details: {},
          },
        ],
        {
          session: databaseSession,
        },
      );
    },
    {
      readPreference: "primary",
    },
  );
}