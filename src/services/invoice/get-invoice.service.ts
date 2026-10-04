import "server-only";
import { Types } from "mongoose";
import { AppError } from "@/lib/errors";
import { Invoice } from "@/models/Invoice";
import { requireBusinessAccess } from "@/services/business/business-access.service";

export async function getInvoice(
  authenticatedUserId: string,
  businessId: string,
  invoiceId: string,
) {
  const { business } = await requireBusinessAccess(
    authenticatedUserId,
    businessId,
    "canManageInvoices",
  );

  if (!/^[a-fA-F0-9]{24}$/.test(invoiceId)) {
    throw new AppError(
      "INVALID_INVOICE_ID",
      "Enter a valid invoice ID.",
      400,
    );
  }

  const invoice = await Invoice.findOne({
    _id: new Types.ObjectId(invoiceId),
    businessId: business._id,
  })
    .select(
      "_id businessId orderId invoiceNumber businessSnapshot customerSnapshot itemsSnapshot subtotal totalAmount currency status issuedAt voidedAt createdAt updatedAt",
    )
    .lean();

  if (!invoice) {
    throw new AppError(
      "INVOICE_NOT_FOUND",
      "Invoice was not found.",
      404,
    );
  }

  return {
    id: invoice._id.toString(),
    businessId: invoice.businessId.toString(),
    orderId: invoice.orderId.toString(),
    invoiceNumber: invoice.invoiceNumber,

    businessSnapshot: {
      name: invoice.businessSnapshot.name,
      email: invoice.businessSnapshot.email,
      phone: invoice.businessSnapshot.phone,
      address: invoice.businessSnapshot.address,
    },

    customerSnapshot: {
      name: invoice.customerSnapshot.name,
      email: invoice.customerSnapshot.email,
      phone: invoice.customerSnapshot.phone,
      address: invoice.customerSnapshot.address,
    },

    itemsSnapshot: invoice.itemsSnapshot.map((item) => ({
      productId: item.productId.toString(),
      productNameSnapshot: item.productNameSnapshot,
      quantity: item.quantity,
      unitPriceAtOrder: item.unitPriceAtOrder,
      lineTotal: item.lineTotal,
    })),

    subtotal: invoice.subtotal,
    totalAmount: invoice.totalAmount,
    currency: invoice.currency,
    status: invoice.status,
    issuedAt: invoice.issuedAt,
    voidedAt: invoice.voidedAt,
    createdAt: invoice.createdAt,
    updatedAt: invoice.updatedAt,
  };
}