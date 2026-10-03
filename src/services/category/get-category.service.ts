import "server-only";
import { Types } from "mongoose";
import { AppError } from "@/lib/errors";
import { Category } from "@/models/Category";
import { requireCategoryReadAccess } from "@/services/category/category-read-access.service";

export async function getCategory(
  authenticatedUserId: string,
  businessId: string,
  categoryId: string,
) {
  const { business, canManageCategories } =
    await requireCategoryReadAccess(
      authenticatedUserId,
      businessId,
    );

  if (!/^[a-fA-F0-9]{24}$/.test(categoryId)) {
    throw new AppError(
      "INVALID_CATEGORY_ID",
      "Enter a valid category ID.",
      400,
    );
  }

  const fields = canManageCategories
    ? "_id businessId name description status createdAt updatedAt"
    : "_id name";

  const category = await Category.findOne({
    _id: new Types.ObjectId(categoryId),
    businessId: business._id,
    ...(!canManageCategories ? { status: "Active" } : {}),
  })
    .select(fields)
    .lean();

  if (!category) {
    throw new AppError(
      "CATEGORY_NOT_FOUND",
      "Category was not found.",
      404,
    );
  }

  if (!canManageCategories) {
    return {
      id: category._id.toString(),
      name: category.name,
    };
  }

  return {
    id: category._id.toString(),
    businessId: category.businessId.toString(),
    name: category.name,
    description: category.description,
    status: category.status,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
  };
}