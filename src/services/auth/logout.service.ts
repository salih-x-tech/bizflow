import "server-only";
import { connectDB } from "@/lib/db/connect";
import { hashToken, isValidAuthToken } from "@/lib/auth/tokens";
import { AuditLog } from "@/models/AuditLog";
import { Session } from "@/models/Session";

export async function logoutUser(
  token: string | undefined,
): Promise<void> {
  if (!token || !isValidAuthToken(token)) {
    return;
  }

  const connection = await connectDB();
  await AuditLog.init();

  await connection.connection.transaction(
    async (databaseSession) => {
      const session = await Session.findOneAndUpdate(
        {
          tokenHash: hashToken(token),
          revokedAt: null,
        },
        {
          $set: {
            revokedAt: new Date(),
          },
        },
        {
          session: databaseSession,
          returnDocument: "before",
        },
      ).select("_id userId");

      if (!session) {
        return;
      }

      await AuditLog.create(
        [
          {
            scope: "Account",
            userId: session.userId,
            action: "LOGOUT_SUCCEEDED",
            entityType: "User",
            entityId: session.userId,
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