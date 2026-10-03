import "server-only";
import { Types } from "mongoose";
import { connectDB } from "@/lib/db/connect";
import { AppError } from "@/lib/errors";
import { updateProductSchema } from "@/lib/validation/product";
import { AuditLog } from "@/models/AuditLog";
import { Category } from "@/models/Category";
import { Media } from "@/models/Media";
import { Product } from "@/models/Product";
import { requireBusinessAccess } from "@/services/business/business-access.service";
import { assertTransactionPermission } from "@/services/business/transaction-permission.service";

export async function updateProduct(
  authenticatedUserId: string,
  businessId: string,
  productId: string,
  input: unknown,
) {
  const { business, membership } = await requireBusinessAccess(
    authenticatedUserId,
    businessId,
    "canManageProducts",
  );

  if (!/^[a-fA-F0-9]{24}$/.test(productId)) {
    throw new AppError(
      "INVALID_PRODUCT_ID",
      "Enter a valid product ID.",
      400,
    );
  }

  const data = updateProductSchema.parse(input);
  const productObjectId = new Types.ObjectId(productId);
  const connection = await connectDB();

  await Promise.all([
    Product.init(),
    AuditLog.init(),
  ]);

  return connection.connection.transaction(
    async (databaseSession) => {
      await assertTransactionPermission(
        membership.userId,
        business._id,
        "canManageProducts",
        databaseSession,
      );

      const product = await Product.findOne({
        _id: productObjectId,
        businessId: business._id,
      }).session(databaseSession);

      if (!product) {
        throw new AppError(
          "PRODUCT_NOT_FOUND",
          "Product was not found.",
          404,
        );
      }

      const previousStatus = product.status;
      const restoring =
        previousStatus === "Archived" && data.status === "Active";

      const categoryId =
        data.categoryId !== undefined
          ? new Types.ObjectId(data.categoryId)
          : product.categoryId;

      if (data.categoryId !== undefined || restoring) {
        const activeCategory = await Category.exists({
          _id: categoryId,
          businessId: business._id,
          status: "Active",
        }).session(databaseSession);

        if (!activeCategory) {
          throw new AppError(
            "CATEGORY_NOT_FOUND",
            "Select an active category from this business.",
            404,
          );
        }
      }

      const mediaIds =
        data.mediaIds !== undefined
          ? data.mediaIds.map((id) => new Types.ObjectId(id))
          : product.mediaIds;

      if (
        (data.mediaIds !== undefined || restoring) &&
        mediaIds.length > 0
      ) {
        const mediaCount = await Media.countDocuments({
          _id: { $in: mediaIds },
          businessId: business._id,
        }).session(databaseSession);

        if (mediaCount !== mediaIds.length) {
          throw new AppError(
            "INVALID_MEDIA_REFERENCE",
            "Every media record must belong to this business.",
            400,
          );
        }
      }

      if (data.name !== undefined) {
        product.name = data.name;
      }

      if (Object.prototype.hasOwnProperty.call(data, "description")) {
        product.set("description", data.description);
      }

      if (data.categoryId !== undefined) {
        product.categoryId = categoryId;
      }

      if (data.price !== undefined) {
        product.price = data.price;
      }

      if (data.mediaIds !== undefined) {
        product.mediaIds = mediaIds;
      }

      if (data.status !== undefined) {
        product.status = data.status;
      }

      await product.save({
        session: databaseSession,
      });

      const statusChanged = previousStatus !== product.status;

      const action = statusChanged
        ? product.status === "Archived"
          ? "PRODUCT_ARCHIVED"
          : "PRODUCT_RESTORED"
        : "PRODUCT_UPDATED";

      await AuditLog.create(
        [
          {
            scope: "Business",
            businessId: business._id,
            userId: membership.userId,
            action,
            entityType: "Product",
            entityId: product._id,
            details: {
              fields: Object.keys(data),
              previousStatus,
              status: product.status,
            },
          },
        ],
        {
          session: databaseSession,
          ordered: true,
        },
      );

      return {
        id: product._id.toString(),
        businessId: product.businessId.toString(),
        categoryId: product.categoryId.toString(),
        name: product.name,
        description: product.description,
        price: product.price,
        mediaIds: product.mediaIds.map((id) => id.toString()),
        status: product.status,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
      };
    },
    {
      readPreference: "primary",
    },
  );
}