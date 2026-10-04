import "server-only";
import { Types } from "mongoose";
import { connectDB } from "@/lib/db/connect";
import { AppError } from "@/lib/errors";
import { AuditLog } from "@/models/AuditLog";
import { Inventory } from "@/models/Inventory";
import { InventoryAdjustment } from "@/models/InventoryAdjustment";
import { Invoice } from "@/models/Invoice";
import { Order } from "@/models/Order";
import { requireBusinessAccess } from "@/services/business/business-access.service";
import { assertTransactionPermission } from "@/services/business/transaction-permission.service";

export async function cancelOrder(
  authenticatedUserId: string,
  businessId: string,
  orderId: string,
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

  const orderObjectId = new Types.ObjectId(orderId);
  const connection = await connectDB();

  await Promise.all([
    Order.init(),
    Inventory.init(),
    InventoryAdjustment.init(),
    Invoice.init(),
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

      if (order.status === "Cancelled") {
        throw new AppError(
          "INVALID_ORDER_TRANSITION",
          "This order is already Cancelled.",
          409,
        );
      }

      const previousStatus = order.status;

      const invoice = await Invoice.findOne({
        orderId: order._id,
        businessId: business._id,
      }).session(databaseSession);

      if (previousStatus === "Pending" && invoice) {
        throw new AppError(
          "INCONSISTENT_ORDER_STATE",
          "A Pending order must not have an invoice.",
          409,
        );
      }

      if (previousStatus === "Completed") {
        if (!invoice || invoice.status !== "Issued") {
          throw new AppError(
            "INCONSISTENT_ORDER_STATE",
            "A Completed order must have an Issued invoice.",
            409,
          );
        }

        const productIds = order.items.map(
          (item) => item.productId.toString(),
        );

        if (
          productIds.length === 0 ||
          new Set(productIds).size !== productIds.length ||
          order.items.some(
            (item) =>
              !Number.isSafeInteger(item.quantity) ||
              item.quantity < 1,
          )
        ) {
          throw new AppError(
            "INVALID_ORDER_ITEMS",
            "The order contains invalid or duplicate items.",
            409,
          );
        }

        for (const item of order.items) {
          const inventory = await Inventory.findOne({
            businessId: business._id,
            productId: item.productId,
          }).session(databaseSession);

          if (!inventory) {
            throw new AppError(
              "INVENTORY_NOT_FOUND",
              "Inventory was not found for an order product.",
              404,
            );
          }

          const previousQuantity = inventory.quantity;
          const newQuantity = previousQuantity + item.quantity;

          if (!Number.isSafeInteger(newQuantity)) {
            throw new AppError(
              "INVALID_STOCK_QUANTITY",
              "Restored stock exceeds the supported range.",
              409,
            );
          }

          inventory.quantity = newQuantity;

          await inventory.save({
            session: databaseSession,
          });

          await InventoryAdjustment.create(
            [
              {
                businessId: business._id,
                productId: item.productId,
                userId: membership.userId,
                type: "ORDER_REVERSAL",
                quantityChange: item.quantity,
                previousQuantity,
                newQuantity,
                orderId: order._id,
                reason: "Completed order cancelled.",
              },
            ],
            {
              session: databaseSession,
              ordered: true,
            },
          );

          await AuditLog.create(
            [
              {
                scope: "Business",
                businessId: business._id,
                userId: membership.userId,
                action: "INVENTORY_ADJUSTED",
                entityType: "Inventory",
                entityId: inventory._id,
                details: {
                  orderId: order._id.toString(),
                  adjustmentType: "ORDER_REVERSAL",
                  quantityChange: item.quantity,
                  previousQuantity,
                  newQuantity,
                },
              },
            ],
            {
              session: databaseSession,
              ordered: true,
            },
          );
        }

        invoice.status = "Voided";
        invoice.voidedAt = new Date();

        await invoice.save({
          session: databaseSession,
        });

        await AuditLog.create(
          [
            {
              scope: "Business",
              businessId: business._id,
              userId: membership.userId,
              action: "INVOICE_VOIDED",
              entityType: "Invoice",
              entityId: invoice._id,
              details: {
                orderId: order._id.toString(),
                invoiceNumber: invoice.invoiceNumber,
              },
            },
          ],
          {
            session: databaseSession,
            ordered: true,
          },
        );
      }

      order.status = "Cancelled";

      await order.save({
        session: databaseSession,
      });

      await AuditLog.create(
        [
          {
            scope: "Business",
            businessId: business._id,
            userId: membership.userId,
            action: "ORDER_CANCELLED",
            entityType: "Order",
            entityId: order._id,
            details: {
              previousStatus,
              invoiceId: invoice?._id.toString() ?? null,
              stockRestored: previousStatus === "Completed",
            },
          },
        ],
        {
          session: databaseSession,
          ordered: true,
        },
      );

      return {
        order: {
          id: order._id.toString(),
          status: order.status,
          totalAmount: order.totalAmount,
          updatedAt: order.updatedAt,
        },
        invoice: invoice
          ? {
              id: invoice._id.toString(),
              orderId: invoice.orderId.toString(),
              invoiceNumber: invoice.invoiceNumber,
              status: invoice.status,
              totalAmount: invoice.totalAmount,
              currency: invoice.currency,
              voidedAt: invoice.voidedAt,
            }
          : null,
      };
    },
    {
      readPreference: "primary",
    },
  );
}