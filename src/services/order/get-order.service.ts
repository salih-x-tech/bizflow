import "server-only";
import { Types } from "mongoose";
import { AppError } from "@/lib/errors";
import { Order } from "@/models/Order";
import { requireBusinessAccess } from "@/services/business/business-access.service";

export async function getOrder(
  authenticatedUserId: string,
  businessId: string,
  orderId: string,
) {
  const { business } = await requireBusinessAccess(
    authenticatedUserId,
    businessId,
    "canManageOrders",
  );

  if (!/^[a-fA-F0-9]{24}$/.test(orderId)) {
    throw new AppError(
      "INVALID_ORDER_ID",
      "Enter a valid order ID.",
      400,
    );
  }

  const order = await Order.findOne({
    _id: new Types.ObjectId(orderId),
    businessId: business._id,
  })
    .select(
      "_id businessId customerId items totalAmount status createdBy createdAt updatedAt",
    )
    .lean();

  if (!order) {
    throw new AppError(
      "ORDER_NOT_FOUND",
      "Order was not found.",
      404,
    );
  }

  return {
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
  };
}