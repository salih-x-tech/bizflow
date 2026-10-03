import "server-only";
import { connectDB } from "@/lib/db/connect";
import { AppError } from "@/lib/errors";
import { createCategorySchema } from "@/lib/validation/category";
import { AuditLog } from "@/models/AuditLog";
import { Category } from "@/models/Category";
import { requireBusinessAccess } from "@/services/business/business-access.service";
import { assertTransactionPermission } from "@/services/business/transaction-permission.service";

export async function createCategory(
  authenticatedUserId: string,
  businessId: string,
  input: unknown,
) {
  const { business, membership } = await requireBusinessAccess(
    authenticatedUserId,
    businessId,
    "canManageCategories",
  );

  const data = createCategorySchema.parse(input);
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

        const [category] = await Category.create(
          [
            {
              ...data,
              businessId: business._id,
              normalizedName: data.name.toLowerCase(),
              status: "Active",
            },
          ],
          {
            session: databaseSession,
          },
        );

        if (!category) {
          throw new Error("Category creation failed.");
        }

        await AuditLog.create(
          [
            {
              scope: "Business",
              businessId: business._id,
              userId: membership.userId,
              action: "CATEGORY_CREATED",
              entityType: "Category",
              entityId: category._id,
              details: {},
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