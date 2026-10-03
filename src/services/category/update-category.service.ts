import "server-only";
import { Types } from "mongoose";
import { connectDB } from "@/lib/db/connect";
import { AppError } from "@/lib/errors";
import { updateCategorySchema } from "@/lib/validation/category";
import { AuditLog } from "@/models/AuditLog";
import { Category } from "@/models/Category";
import { requireBusinessAccess } from "@/services/business/business-access.service";
import { assertTransactionPermission } from "@/services/business/transaction-permission.service";

export async function updateCategory(
  authenticatedUserId: string,
  businessId: string,
  categoryId: string,
  input: unknown,
) {
  const { business, membership } = await requireBusinessAccess(
    authenticatedUserId,
    businessId,
    "canManageCategories",
  );

  if (!/^[a-fA-F0-9]{24}$/.test(categoryId)) {
    throw new AppError(
      "INVALID_CATEGORY_ID",
      "Enter a valid category ID.",
      400,
    );
  }

  const data = updateCategorySchema.parse(input);
  const categoryObjectId = new Types.ObjectId(categoryId);
  const connection = await connectDB();

  await Promise.all([
    Category.init(),
    AuditLog.init(),
  ]);

  try {
    return await connection.connection.transaction(
      async (databaseSession) => {
        await assertTransactionPermission(
          membership.userId,
          business._id,
          "canManageCategories",
          databaseSession,
        );

        const category = await Category.findOne({
          _id: categoryObjectId,
          businessId: business._id,
        }).session(databaseSession);

        if (!category) {
          throw new AppError(
            "CATEGORY_NOT_FOUND",
            "Category was not found.",
            404,
          );
        }

        const previousStatus = category.status;

        if (data.name !== undefined) {
          category.name = data.name;
        }

        if (Object.prototype.hasOwnProperty.call(data, "description")) {
          category.set("description", data.description);
        }

        if (data.status !== undefined) {
          category.status = data.status;
        }

        await category.save({
          session: databaseSession,
        });

        const statusChanged = previousStatus !== category.status;

        const action = statusChanged
          ? category.status === "Archived"
            ? "CATEGORY_ARCHIVED"
            : "CATEGORY_RESTORED"
          : "CATEGORY_UPDATED";

        await AuditLog.create(
          [
            {
              scope: "Business",
              businessId: business._id,
              userId: membership.userId,
              action,
              entityType: "Category",
              entityId: category._id,
              details: {
                fields: Object.keys(data),
                previousStatus,
                status: category.status,
              },
            },
          ],
          {
            session: databaseSession,
          },
        );

        return {
          id: category._id.toString(),
          businessId: category.businessId.toString(),
          name: category.name,
          description: category.description,
          status: category.status,
          createdAt: category.createdAt,
          updatedAt: category.updatedAt,
        };
      },
      {
        readPreference: "primary",
      },
    );
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    ) {
      throw new AppError(
        "CATEGORY_NAME_ALREADY_EXISTS",
        "An active category with this name already exists in this business.",
        409,
        [
          {
            field: "name",
            issue: "Active category names must be unique within the business.",
          },
        ],
      );
    }

    throw error;
  }
}