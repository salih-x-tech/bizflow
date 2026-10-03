import "server-only";
import { Types } from "mongoose";
import { AppError } from "@/lib/errors";
import { listProductsQuerySchema } from "@/lib/validation/product";
import { Product } from "@/models/Product";
import { requireProductReadAccess } from "@/services/product/product-read-access.service";

function literalSearch(value: string): RegExp {
  const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(escaped, "i");
}

export async function listProducts(
  authenticatedUserId: string,
  businessId: string,
  input: unknown,
) {
  const {
    business,
    canManageProducts,
    canManageOrders,
    canManageInventory,
  } = await requireProductReadAccess(
    authenticatedUserId,
    businessId,
  );

  const query = listProductsQuerySchema.parse(input);

  if (
    !canManageProducts &&
    !canManageInventory &&
    query.status !== "Active"
  ) {
    throw new AppError(
      "FORBIDDEN",
      "Order lookups can only list active products.",
      403,
    );
  }

  const filter = {
    businessId: business._id,

    ...(query.status !== "All"
      ? { status: query.status }
      : {}),

    ...(query.categoryId
      ? { categoryId: new Types.ObjectId(query.categoryId) }
      : {}),

    ...(query.search
      ? { name: literalSearch(query.search) }
      : {}),
  };

  const fields = canManageProducts
    ? "_id businessId categoryId name description price mediaIds status createdAt updatedAt"
    : canManageOrders
      ? "_id categoryId name price status"
      : "_id categoryId name status";

  const [products, total] = await Promise.all([
    Product.find(filter)
      .select(fields)
      .sort({ createdAt: -1, _id: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .lean(),

    Product.countDocuments(filter),
  ]);

  return {
    products: products.map((product) => {
      if (!canManageProducts) {
        return {
          id: product._id.toString(),
          categoryId: product.categoryId.toString(),
          name: product.name,
          status: product.status,
          ...(canManageOrders ? { price: product.price } : {}),
        };
      }

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
    }),

    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };
}