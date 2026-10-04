import "server-only";
import { Types } from "mongoose";
import { listOrdersQuerySchema } from "@/lib/validation/order";
import { Order } from "@/models/Order";
import { requireBusinessAccess } from "@/services/business/business-access.service";

export async function listOrders(
  authenticatedUserId: string,
  businessId: string,
  input: unknown,
) {
  const { business } = await requireBusinessAccess(
    authenticatedUserId,
    businessId,
    "canManageOrders",
  );

  const query = listOrdersQuerySchema.parse(input);

  const filter = {
    businessId: business._id,
    ...(query.customerId !== undefined
      ? { customerId: new Types.ObjectId(query.customerId) }
      : {}),
    ...(query.status !== "All"
      ? { status: query.status }
      : {}),
  };

  const [records, total] = await Promise.all([
    Order.find(filter)
      .select(
        "_id businessId customerId items totalAmount status createdBy createdAt updatedAt",
      )
      .sort({
        createdAt: -1,
        _id: -1,
      })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .lean(),

    Order.countDocuments(filter),
  ]);

  const orders = records.map((order) => ({
    id: order._id.toString(),
    businessId: order.businessId.toString(),
    customerId: order.customerId.toString(),
    items: order.items.map((item) => ({
      productId: item.productId.toString(),
      productNameSnapshot: item.productNameSnapshot,
      quantity: item.quantity,
      unitPriceAtOrder: item.unitPriceAtOrder,
      lineTotal: item.lineTotal,
    })),
    totalAmount: order.totalAmount,
    status: order.status,
    createdBy: order.createdBy.toString(),
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  }));

  return {
    orders,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };
}