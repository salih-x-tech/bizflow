import "server-only";
import type { ClientSession, Types } from "mongoose";
import { AppError } from "@/lib/errors";
import { Media } from "@/models/Media";

export async function lockMediaReferences(
  businessId: Types.ObjectId,
  mediaIds: readonly Types.ObjectId[],
  databaseSession: ClientSession,
) {
  if (!databaseSession.inTransaction()) {
    throw new Error(
      "Media reference locking requires a database transaction.",
    );
  }

  const uniqueIds = new Map(
    mediaIds.map((id) => [id.toString(), id]),
  );

  if (uniqueIds.size !== mediaIds.length) {
    throw new AppError(
      "DUPLICATE_MEDIA_REFERENCE",
      "Each media record may only be assigned once.",
      400,
    );
  }

  const sortedIds = [...uniqueIds.entries()].sort(
    ([first], [second]) => first.localeCompare(second),
  );

  for (const [, mediaId] of sortedIds) {
    const result = await Media.updateOne(
      {
        _id: mediaId,
        businessId,
        $and: [
          {
            $or: [
              { status: "Active" },
              { status: { $exists: false } },
            ],
          },
          {
            $or: [
              {
                referenceVersion: {
                  $lt: Number.MAX_SAFE_INTEGER,
                },
              },
              {
                referenceVersion: { $exists: false },
              },
            ],
          },
        ],
      },
      {
        $set: { status: "Active" },
        $inc: { referenceVersion: 1 },
      },
      {
        session: databaseSession,
        runValidators: true,
      },
    );

    if (result.matchedCount !== 1) {
      throw new AppError(
        "INVALID_MEDIA_REFERENCE",
        "Every media record must be available and belong to this business.",
        400,
      );
    }
  }
}