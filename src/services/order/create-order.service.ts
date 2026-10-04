import "server-only";
import { Types } from "mongoose";
import { connectDB } from "@/lib/db/connect";
import { AppError } from "@/lib/errors";
import { createOrderSchema } from "@/lib/validation/order";
import { AuditLog } from "@/models/AuditLog";
import { Customer } from "@/models/Customer";
import { Order } from "@/models/Order";
import { requireBusinessAccess } from "@/services/business/business-access.service";
import { assertTransactionPermission } from "@/services/business/transaction-permission.service";
import { buildOrderItems } from "@/services/order/build-order-items.service";

export async function createOrder(
  authenticatedUserId: string,
  businessId: string,
  input: unknown,
) {
  const { business, membership } = await requireBusinessAccess(
    authenticatedUserId,
    businessId,
    "canManageOrders",
  );

  const data = createOrderSchema.parse(input);
  const customerId = new Types.ObjectId(data.customerId);
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

      const { items, totalAmount } = await buildOrderItems(
        business._id,
        data.items,
        databaseSession,
      );

      const [order] = await Order.create(
        [
          {
            businessId: business._id,
            customerId,
            items,
            totalAmount,
            status: "Pending",
            createdBy: membership.userId,
          },
        ],
        {
          session: databaseSession,
          ordered: true,
        },
      );

      if (!order) {
        throw new Error("Order creation failed.");
      }

      await AuditLog.create(
        [
          {
            scope: "Business",
            businessId: business._id,
            userId: membership.userId,
            action: "ORDER_CREATED",
            entityType: "Order",
            entityId: order._id,
            details: {
              customerId: customerId.toString(),
              itemCount: order.items.length,
              totalAmount: order.totalAmount,
              status: order.status,
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