import { randomBytes } from "node:crypto";
import { Types } from "mongoose";
import { connectDB } from "@/lib/db/connect";
import { Session } from "@/models/Session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return Response.json({ message: "Not found" }, { status: 404 });
  }

  const origin = request.headers.get("origin");

  if (origin && origin !== new URL(request.url).origin) {
    return Response.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    const connection = await connectDB();
    const transactionSession = await connection.startSession();
    const probeId = new Types.ObjectId();

    try {
      transactionSession.startTransaction();

      await Session.create(
        [
          {
            _id: probeId,
            userId: new Types.ObjectId(),
            tokenHash: randomBytes(32).toString("hex"),
            expiresAt: new Date(Date.now() + 60 * 60 * 1000),
          },
        ],
        { session: transactionSession },
      );

      const insideTransaction = await Session.exists({
        _id: probeId,
      }).session(transactionSession);

      if (!insideTransaction) {
        throw new Error("Transaction insert was not visible.");
      }

      await transactionSession.abortTransaction();

      const afterRollback = await Session.exists({ _id: probeId });

      if (afterRollback) {
        throw new Error("Transaction rollback failed.");
      }

      return Response.json({
        success: true,
        message: "Transaction insert and rollback verified.",
        temporaryRecordRemaining: false,
      });
    } finally {
      try {
        if (transactionSession.inTransaction()) {
          await transactionSession.abortTransaction();
        }
      } finally {
        await transactionSession.endSession();
      }
    }
  } catch {
    return Response.json(
      { success: false, message: "Transaction verification failed." },
      { status: 500 },
    );
  }
}