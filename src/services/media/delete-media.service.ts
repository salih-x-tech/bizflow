import "server-only";
import { Types } from "mongoose";
import { connectDB } from "@/lib/db/connect";
import { AppError } from "@/lib/errors";
import { deleteImage } from "@/lib/media/delete-image";
import { buildMediaPublicId } from "@/lib/media/upload-image";
import { AuditLog } from "@/models/AuditLog";
import { Media } from "@/models/Media";
import { Product } from "@/models/Product";
import { requireBusinessAccess } from "@/services/business/business-access.service";
import { assertTransactionPermission } from "@/services/business/transaction-permission.service";

export async function deleteMedia(
  authenticatedUserId: string,
  businessId: string,
  mediaId: string,
) {
  const { business, membership } =
    await requireBusinessAccess(
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

  const mediaObjectId = new Types.ObjectId(mediaId);
  const connection = await connectDB();

  await Promise.all([
    Media.init(),
    Product.init(),
    AuditLog.init(),
  ]);

  const pendingMedia =
    await connection.connection.transaction(
      async (databaseSession) => {
        await assertTransactionPermission(
          membership.userId,
          business._id,
          "canManageProducts",
          databaseSession,
        );

        const record = await Media.findOne({
          _id: mediaObjectId,
          businessId: business._id,
        }).session(databaseSession);

        if (!record) {
          throw new AppError(
            "MEDIA_NOT_FOUND",
            "Media not found.",
            404,
          );
        }

        const expectedPublicId = buildMediaPublicId(
          business._id.toString(),
          record._id.toString(),
        );

        if (record.publicId !== expectedPublicId) {
          throw new AppError(
            "MEDIA_STORAGE_ID_MISMATCH",
            "The media storage identifier does not match this record.",
            409,
          );
        }

        if (
          !Number.isSafeInteger(record.referenceVersion) ||
          record.referenceVersion < 0 ||
          record.referenceVersion >= Number.MAX_SAFE_INTEGER
        ) {
          throw new AppError(
            "MEDIA_VERSION_OUT_OF_RANGE",
            "The media reference version is invalid.",
            409,
          );
        }

        const alreadyDeleting = record.status === "Deleting";

        record.status = "Deleting";
        record.referenceVersion += 1;

        await record.save({
          session: databaseSession,
        });

        const referencedProduct = await Product.exists({
          businessId: business._id,
          mediaIds: mediaObjectId,
        }).session(databaseSession);

        if (referencedProduct) {
          throw new AppError(
            "MEDIA_IN_USE",
            "Remove this image from all products before deleting it.",
            409,
          );
        }

        if (!alreadyDeleting) {
          await AuditLog.create(
            [
              {
                scope: "Business",
                businessId: business._id,
                userId: membership.userId,
                action: "MEDIA_DELETION_REQUESTED",
                entityType: "Media",
                entityId: mediaObjectId,
                details: {},
              },
            ],
            {
              session: databaseSession,
              ordered: true,
            },
          );
        }

        return {
          id: record._id.toString(),
          publicId: record.publicId,
        };
      },
      {
        readPreference: "primary",
      },
    );

  await deleteImage(
    business._id.toString(),
    pendingMedia.id,
    pendingMedia.publicId,
  );

  return connection.connection.transaction(
    async (databaseSession) => {
      await assertTransactionPermission(
        membership.userId,
        business._id,
        "canManageProducts",
        databaseSession,
      );

      const record = await Media.findOne({
        _id: mediaObjectId,
        businessId: business._id,
      }).session(databaseSession);

      if (!record) {
        return {
          id: pendingMedia.id,
          deleted: true,
        };
      }

      if (record.status !== "Deleting") {
        throw new AppError(
          "INVALID_MEDIA_DELETE_STATE",
          "The media record is not marked for deletion.",
          409,
        );
      }

      await Media.deleteOne(
        {
          _id: mediaObjectId,
          businessId: business._id,
          status: "Deleting",
        },
        {
          session: databaseSession,
        },
      );

      await AuditLog.create(
        [
          {
            scope: "Business",
            businessId: business._id,
            userId: membership.userId,
            action: "MEDIA_DELETED",
            entityType: "Media",
            entityId: mediaObjectId,
            details: {},
          },
        ],
        {
          session: databaseSession,
          ordered: true,
        },
      );

      return {
        id: pendingMedia.id,
        deleted: true,
      };
    },
    {
      readPreference: "primary",
    },
  );
}