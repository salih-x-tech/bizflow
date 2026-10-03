import "server-only";
import { Types } from "mongoose";
import { AppError } from "@/lib/errors";
import { Product } from "@/models/Product";
import { requireProductReadAccess } from "@/services/product/product-read-access.service";

export async function getProduct(
  authenticatedUserId: string,
  businessId: string,
  productId: string,
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

  if (!/^[a-fA-F0-9]{24}$/.test(productId)) {
    throw new AppError(
      "INVALID_PRODUCT_ID",
      "Enter a valid product ID.",
      400,
    );
  }

  const fields = canManageProducts
    ? "_id businessId categoryId name description price mediaIds status createdAt updatedAt"
    : canManageOrders
      ? "_id categoryId name price status"
      : "_id categoryId name status";

  const product = await Product.findOne({
    _id: new Types.ObjectId(productId),
    businessId: business._id,
    ...(!canManageProducts && !canManageInventory
      ? { status: "Active" }
      : {}),
  })
    .select(fields)
    .lean();

  if (!product) {
    throw new AppError(
      "PRODUCT_NOT_FOUND",
      "Product was not found.",
      404,
    );
  }

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
}