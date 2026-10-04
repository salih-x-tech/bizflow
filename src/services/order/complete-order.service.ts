import "server-only";
import { Types } from "mongoose";
import { connectDB } from "@/lib/db/connect";
import { AppError } from "@/lib/errors";
import {
  calculateLineTotal,
  calculateOrderTotal,
} from "@/lib/money";
import { AuditLog } from "@/models/AuditLog";
import { Business } from "@/models/Business";
import { Customer } from "@/models/Customer";
import { Inventory } from "@/models/Inventory";
import { InventoryAdjustment } from "@/models/InventoryAdjustment";
import { Invoice } from "@/models/Invoice";
import { Order } from "@/models/Order";
import { Product } from "@/models/Product";
import { requireBusinessAccess } from "@/services/business/business-access.service";
import { assertTransactionPermission } from "@/services/business/transaction-permission.service";

export async function completeOrder(
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

      if (order.status !== "Pending") {
        throw new AppError(
          "INVALID_ORDER_TRANSITION",
          "Only Pending orders may be completed.",
          409,
        );
      }

      const productIds = order.items.map(
        (item) => item.productId.toString(),
      );

      if (
        productIds.length === 0 ||
        new Set(productIds).size !== productIds.length
      ) {
        throw new AppError(
          "INVALID_ORDER_ITEMS",
          "The order contains invalid or duplicate items.",
          409,
        );
      }

      const lineTotals = order.items.map((item) =>
        calculateLineTotal(item.unitPriceAtOrder, item.quantity),
      );

      const calculatedTotal = calculateOrderTotal(lineTotals);

      if (
        calculatedTotal !== order.totalAmount ||
        order.items.some(
          (item, index) => item.lineTotal !== lineTotals[index],
        )
      ) {
        throw new AppError(
          "INVALID_ORDER_TOTAL",
          "The saved order totals are inconsistent.",
          409,
        );
      }

      const currentBusiness = await Business.findById(business._id)
        .session(databaseSession)
        .lean();

      const customer = await Customer.findOne({
        _id: order.customerId,
        businessId: business._id,
      })
        .session(databaseSession)
        .lean();

      if (!currentBusiness || !customer) {
        throw new AppError(
          "ORDER_REFERENCE_NOT_FOUND",
          "The business or customer required by this order was not found.",
          404,
        );
      }

      const productCount = await Product.countDocuments({
        _id: { $in: order.items.map((item) => item.productId) },
        businessId: business._id,
      }).session(databaseSession);

      if (productCount !== order.items.length) {
        throw new AppError(
          "PRODUCT_NOT_FOUND",
          "Every order product must belong to this business.",
          404,
        );
      }

      const existingInvoice = await Invoice.exists({
        orderId: order._id,
      }).session(databaseSession);

      if (existingInvoice) {
        throw new AppError(
          "ORDER_ALREADY_INVOICED",
          "This order already has an invoice.",
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

        if (previousQuantity < item.quantity) {
          throw new AppError(
            "INSUFFICIENT_STOCK",
            "An order product has insufficient stock.",
            409,
            [
              {
                field: "items",
                issue: `Insufficient stock for product ${item.productId.toString()}.`,
              },
            ],
          );
        }

        inventory.quantity = previousQuantity - item.quantity;

        await inventory.save({
          session: databaseSession,
        });

        await InventoryAdjustment.create(
          [
            {
              businessId: business._id,
              productId: item.productId,
              userId: membership.userId,
              type: "ORDER_DEDUCTION",
              quantityChange: -item.quantity,
              previousQuantity,
              newQuantity: inventory.quantity,
              orderId: order._id,
              reason: "Order completed.",
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
                adjustmentType: "ORDER_DEDUCTION",
                quantityChange: -item.quantity,
                previousQuantity,
                newQuantity: inventory.quantity,
              },
            },
          ],
          {
            session: databaseSession,
            ordered: true,
          },
        );
      }

      const issuedAt = new Date();
      const invoiceNumber =
        `INV-${order._id.toString().toUpperCase()}`;

      const [invoice] = await Invoice.create(
        [
          {
            businessId: business._id,
            orderId: order._id,
            invoiceNumber,
            businessSnapshot: {
              name: currentBusiness.name,
              email: currentBusiness.contactEmail,
              phone: currentBusiness.contactPhone,
              address: currentBusiness.address,
            },
            customerSnapshot: {
              name: customer.name,
              email: customer.email,
              phone: customer.phone,
              address: customer.address,
            },
            itemsSnapshot: order.items.map((item) => ({
              productId: item.productId,
              productNameSnapshot: item.productNameSnapshot,
              quantity: item.quantity,
              unitPriceAtOrder: item.unitPriceAtOrder,
              lineTotal: item.lineTotal,
            })),
            subtotal: order.totalAmount,
            totalAmount: order.totalAmount,
            currency: currentBusiness.currency,
            status: "Issued",
            issuedAt,
          },
        ],
        {
          session: databaseSession,
          ordered: true,
        },
      );

      if (!invoice) {
        throw new Error("Invoice creation failed.");
      }

      order.status = "Completed";

      await order.save({
        session: databaseSession,
      });

      await AuditLog.create(
        [
          {
            scope: "Business",
            businessId: business._id,
            userId: membership.userId,
            action: "ORDER_COMPLETED",
            entityType: "Order",
            entityId: order._id,
            details: {
              invoiceId: invoice._id.toString(),
              totalAmount: order.totalAmount,
            },
          },
          {
            scope: "Business",
            businessId: business._id,
            userId: membership.userId,
            action: "INVOICE_CREATED",
            entityType: "Invoice",
            entityId: invoice._id,
            details: {
              orderId: order._id.toString(),
              invoiceNumber,
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
        invoice: {
          id: invoice._id.toString(),
          orderId: invoice.orderId.toString(),
          invoiceNumber: invoice.invoiceNumber,
          status: invoice.status,
          totalAmount: invoice.totalAmount,
          currency: invoice.currency,
          issuedAt: invoice.issuedAt,
        },
      };
    },
    {
      readPreference: "primary",
    },
  );
}