import "server-only";
import { randomBytes } from "node:crypto";
import { connectDB } from "@/lib/db/connect";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { consumeRateLimit } from "@/lib/auth/rate-limit";
import { loginSchema } from "@/lib/validation/auth";
import { AppError } from "@/lib/errors";
import { User } from "@/models/User";
import { AuditLog } from "@/models/AuditLog";
import { createSession } from "@/services/auth/session.service";

let dummyHashPromise: Promise<string> | undefined;

function getDummyPasswordHash(): Promise<string> {
  if (!dummyHashPromise) {
    dummyHashPromise = hashPassword(randomBytes(32).toString("hex"));
  }

  return dummyHashPromise;
}

export async function loginUser(input: unknown) {
  const data = loginSchema.parse(input);

  await consumeRateLimit({
    scope: "auth:login:email",
    identifier: data.email,
    limit: 5,
    windowMs: 15 * 60 * 1000,
  });

  const connection = await connectDB();
  await AuditLog.init();

  const user = await User.findOne({ email: data.email })
    .select("_id name email status")
    .select("+passwordHash");

  const passwordHash =
    user?.passwordHash ?? (await getDummyPasswordHash());

  const passwordMatches = await verifyPassword(
    data.password,
    passwordHash,
  );

  if (!user || !passwordMatches || user.status !== "Active") {
    await AuditLog.create({
      scope: "Account",
      userId: user?._id,
      action: "LOGIN_FAILED",
      entityType: "User",
      entityId: user?._id,
      details: {},
    });

    throw new AppError(
      "INVALID_CREDENTIALS",
      "Invalid email or password.",
      401,
    );
  }

  return connection.connection.transaction(
    async (databaseSession) => {
      const session = await createSession(user._id, databaseSession);

      await AuditLog.create(
        [
          {
            scope: "Account",
            userId: user._id,
            action: "LOGIN_SUCCEEDED",
            entityType: "User",
            entityId: user._id,
            details: {},
          },
        ],
        { session: databaseSession },
      );

      return {
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
        },
        session,
      };
    },
    { readPreference: "primary" },
  );
}