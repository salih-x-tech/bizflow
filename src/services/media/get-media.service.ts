import "server-only";
import { Types } from "mongoose";
import { AppError } from "@/lib/errors";
import { Media } from "@/models/Media";
import { requireBusinessAccess } from "@/services/business/business-access.service";

export async function getMedia(
  authenticatedUserId: string,
  businessId: string,
  mediaId: string,
) {
  const { business } = await requireBusinessAccess(
    authenticatedUserId,
    businessId,
    "canManageProducts",
  );

  if (!/^[a-fA-F0-9]{24}$/.test(mediaId)) {
    throw new AppError(
      "INVALID_MEDIA_ID",
      "Provide a valid media ID.",
      400,
    );
  }

  const record = await Media.findOne({
    _id: new Types.ObjectId(mediaId),
    businessId: business._id,
    status: { $ne: "Deleting" },
  })
    .select(
      "_id businessId url mimeType uploadedBy uploadedAt",
    )
    .lean();

  if (!record) {
    throw new AppError(
      "MEDIA_NOT_FOUND",
      "Media not found.",
      404,
    );
  }

  return {
    id: record._id.toString(),
    businessId: record.businessId.toString(),
    url: record.url,
    mimeType: record.mimeType,
    uploadedBy: record.uploadedBy.toString(),
    uploadedAt: record.uploadedAt,
  };
}