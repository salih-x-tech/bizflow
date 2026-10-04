import "server-only";
import { Types } from "mongoose";
import { listInventoryAdjustmentsQuerySchema } from "@/lib/validation/inventory";
import { InventoryAdjustment } from "@/models/InventoryAdjustment";
import { requireBusinessAccess } from "@/services/business/business-access.service";

export async function listInventoryAdjustments(
  authenticatedUserId: string,
  businessId: string,
  input: unknown,
) {
  const { business } = await requireBusinessAccess(
    authenticatedUserId,
    businessId,
    "canManageInventory",
  );

  const query = listInventoryAdjustmentsQuerySchema.parse(input);

  const filter = {
    businessId: business._id,
    ...(query.productId !== undefined
      ? { productId: new Types.ObjectId(query.productId) }
      : {}),
    ...(query.type !== undefined
      ? { type: query.type }
      : {}),
  };

  const [records, total] = await Promise.all([
    InventoryAdjustment.find(filter)
      .select(
        "_id businessId productId userId type quantityChange previousQuantity newQuantity orderId reason createdAt",
      )
      .sort({
        createdAt: -1,
        _id: -1,
      })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .lean(),

    InventoryAdjustment.countDocuments(filter),
  ]);

  const adjustments = records.map((record) => ({
    id: record._id.toString(),
    businessId: record.businessId.toString(),
    productId: record.productId.toString(),
    userId: record.userId.toString(),
    type: record.type,
    quantityChange: record.quantityChange,
    previousQuantity: record.previousQuantity,
    newQuantity: record.newQuantity,
    orderId: record.orderId?.toString(),
    reason: record.reason,
    createdAt: record.createdAt,
  }));

  return {
    adjustments,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };
}