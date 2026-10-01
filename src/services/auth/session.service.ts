import "server-only";
import type { ClientSession, Types } from "mongoose";
import { connectDB } from "@/lib/db/connect";
import {
  createAuthToken,
  hashToken,
  isValidAuthToken,
} from "@/lib/auth/tokens";
import { SESSION_DURATION_MS } from "@/lib/auth/session-config";
import { Session } from "@/models/Session";
import { User } from "@/models/User";

export async function createSession(
  userId: Types.ObjectId,
  databaseSession?: ClientSession,
) {
  await connectDB();

  const activeUser = await User.exists({
    _id: userId,
    status: "Active",
  }).session(databaseSession ?? null);

  if (!activeUser) {
    throw new Error("An active user is required to create a session.");
  }

  const { token, tokenHash } = createAuthToken();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await Session.create(
    [{ userId, tokenHash, expiresAt }],
    { session: databaseSession },
  );

  return { token, expiresAt };
}

export async function getSession(token: string | undefined) {
  if (!token || !isValidAuthToken(token)) {
    return null;
  }

  await connectDB();

  const session = await Session.findOne({
    tokenHash: hashToken(token),
    expiresAt: { $gt: new Date() },
    revokedAt: null,
  })
    .select("_id userId expiresAt")
    .lean();

  if (!session) {
    return null;
  }

  const user = await User.findOne({
    _id: session.userId,
    status: "Active",
  })
    .select("_id name email")
    .lean();

  if (!user) {
    return null;
  }

  return {
    sessionId: session._id.toString(),
    expiresAt: session.expiresAt,
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
    },
  };
}

export async function revokeSession(
  token: string | undefined,
): Promise<void> {
  if (!token || !isValidAuthToken(token)) {
    return;
  }

  await connectDB();

  await Session.updateOne(
    {
      tokenHash: hashToken(token),
      revokedAt: null,
    },
    {
      $set: { revokedAt: new Date() },
    },
  );
}

export async function revokeAllUserSessions(
  userId: Types.ObjectId,
  databaseSession?: ClientSession,
): Promise<void> {
  await connectDB();

  await Session.updateMany(
    {
      userId,
      revokedAt: null,
    },
    {
      $set: { revokedAt: new Date() },
    },
    { session: databaseSession },
  );
}