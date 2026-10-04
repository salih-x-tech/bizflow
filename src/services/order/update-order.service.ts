import "server-only";
import { Types } from "mongoose";
import { connectDB } from "@/lib/db/connect";
import { AppError } from "@/lib/errors";
import { updateOrderSchema } from "@/lib/validation/order";
import { AuditLog } from "@/models/AuditLog";
import { Customer } from "@/models/Customer";
import { Order } from "@/models/Order";
import { requireBusinessAccess } from "@/services/business/business-access.service";
import { assertTransactionPermission } from "@/services/business/transaction-permission.service";
import { buildOrderItems } from "@/services/order/build-order-items.service";

export async function updateOrder(
  authenticatedUserId: string,
  businessId: string,
  orderId: string,
  input: unknown,
) {
  const { business, membership } = await requireBusinessAccess(
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

  const data = updateOrderSchema.parse(input);
  const orderObjectId = new Types.ObjectId(orderId);
  const connection = await connectDB();

  await Promise.all([
    Order.init(),
    AuditLog.init(),
  ]);

  return connection.connection.transaction(
    async (databaseSession) => {
      await assertTransactionPermission(
        membership.userId,
        business._id,
        "canManageOrders",
        databaseSession,
      );

      const order = await Order.findOne({
        _id: orderObjectId,
        businessId: business._id,
      }).session(databaseSession);

      if (!order) {
        throw new AppError(
          "ORDER_NOT_FOUND",
          "Order was not found.",
          404,
        );
      }

      if (order.status !== "Pending") {
        throw new AppError(
          "ORDER_NOT_EDITABLE",
          "Only Pending orders may be edited.",
          409,
        );
      }

      const previousTotalAmount = order.totalAmount;
      const previousCustomerId = order.customerId.toString();

      if (data.customerId !== undefined) {
        const customerId = new Types.ObjectId(data.customerId);

        const customer = await Customer.exists({
          _id: customerId,
          businessId: business._id,
          status: "Active",
        }).session(databaseSession);

        if (!customer) {
          throw new AppError(
            "CUSTOMER_NOT_FOUND",
            "Select an active customer from this business.",
            404,
          );
        }

        order.customerId = customerId;
      }

      if (data.items !== undefined) {
        const { items, totalAmount } = await buildOrderItems(
          business._id,
          data.items,
          databaseSession,
          order.items,
        );

        order.set("items", items);
        order.totalAmount = totalAmount;
      }

      await order.save({
        session: databaseSession,
      });

      await AuditLog.create(
        [
          {
            scope: "Business",
            businessId: business._id,
            userId: membership.userId,
            action: "ORDER_UPDATED",
            entityType: "Order",
            entityId: order._id,
            details: {
              fields: Object.keys(data),
              previousCustomerId,
              customerId: order.customerId.toString(),
              previousTotalAmount,
              totalAmount: order.totalAmount,
              itemCount: order.items.length,
            },
          },
        ],
        {
          session: databaseSession,
          ordered: true,
        },
      );

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
    },
    {
      readPreference: "primary",
    },
  );
}