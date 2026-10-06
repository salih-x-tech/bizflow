import "server-only";
import { Types } from "mongoose";
import { connectDB } from "@/lib/db/connect";
import { deleteImage } from "@/lib/media/delete-image";
import {
  buildMediaPublicId,
  uploadImage,
} from "@/lib/media/upload-image";
import { validateImage } from "@/lib/media/validate-image";
import { AuditLog } from "@/models/AuditLog";
import { Media } from "@/models/Media";
import { requireBusinessAccess } from "@/services/business/business-access.service";
import { assertTransactionPermission } from "@/services/business/transaction-permission.service";

export async function uploadMedia(
  authenticatedUserId: string,
  businessId: string,
  file: File,
) {
  const { business } = await requireBusinessAccess(
    authenticatedUserId,
    businessId,
    "canManageProducts",
  );

  const image = await validateImage(file);

  const connection = await connectDB();

  await Promise.all([
    Media.init(),
    AuditLog.init(),
  ]);

  const mediaId = new Types.ObjectId();
  const userId = new Types.ObjectId(authenticatedUserId);
  const verifiedBusinessId = business._id.toString();

  const publicId = buildMediaPublicId(
    verifiedBusinessId,
    mediaId.toString(),
  );

  try {
    const uploaded = await uploadImage(
      verifiedBusinessId,
      mediaId.toString(),
      image.buffer,
    );

    const media = await connection.connection.transaction(
      async (databaseSession) => {
        await assertTransactionPermission(
          userId,
          business._id,
          "canManageProducts",
          databaseSession,
        );

        const [record] = await Media.create(
          [
            {
              _id: mediaId,
              businessId: business._id,
              publicId: uploaded.publicId,
              url: uploaded.url,
              mimeType: uploaded.mimeType,
              uploadedBy: userId,
            },
          ],
          {
            session: databaseSession,
            ordered: true,
          },
        );

        await AuditLog.create(
          [
            {
              scope: "Business",
              businessId: business._id,
              userId,
              action: "MEDIA_UPLOADED",
              entityType: "Media",
              entityId: mediaId,
              details: {
                mimeType: uploaded.mimeType,
                width: image.width,
                height: image.height,
                size: image.size,
              },
            },
          ],
          {
            session: databaseSession,
            ordered: true,
          },
        );

        return {
          id: record._id.toString(),
          businessId: record.businessId.toString(),
          url: record.url,
          mimeType: record.mimeType,
          uploadedBy: record.uploadedBy.toString(),
          uploadedAt: record.uploadedAt,
        };
      },
    );

    return media;
  } catch (error: unknown) {
    try {
      const savedRecord = await Media.exists({
        _id: mediaId,
        businessId: business._id,
      });

      if (!savedRecord) {
        await deleteImage(
          verifiedBusinessId,
          mediaId.toString(),
          publicId,
        );
      }
    } catch {
      console.error("Media upload cleanup requires retry:", {
        businessId: verifiedBusinessId,
        mediaId: mediaId.toString(),
        publicId,
      });
    }

    throw error;
  }
}