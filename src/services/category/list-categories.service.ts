import "server-only";
import { AppError } from "@/lib/errors";
import { listCategoriesQuerySchema } from "@/lib/validation/category";
import { Category } from "@/models/Category";
import { requireCategoryReadAccess } from "@/services/category/category-read-access.service";

function literalSearch(value: string): RegExp {
  const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(escaped, "i");
}

export async function listCategories(
  authenticatedUserId: string,
  businessId: string,
  input: unknown,
) {
  const { business, canManageCategories } =
    await requireCategoryReadAccess(
      authenticatedUserId,
      businessId,
    );

  const query = listCategoriesQuerySchema.parse(input);

  if (!canManageCategories && query.status !== "Active") {
    throw new AppError(
      "FORBIDDEN",
      "Product lookups can only list active categories.",
      403,
    );
  }

  const filter = {
    businessId: business._id,

    ...(query.status !== "All"
      ? { status: query.status }
      : {}),

    ...(query.search
      ? { name: literalSearch(query.search) }
      : {}),
  };

  const fields = canManageCategories
    ? "_id businessId name description status createdAt updatedAt"
    : "_id name";

  const [categories, total] = await Promise.all([
    Category.find(filter)
      .select(fields)
      .sort({ createdAt: -1, _id: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .lean(),

    Category.countDocuments(filter),
  ]);

  return {
    categories: categories.map((category) => {
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
    }),

    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };
}