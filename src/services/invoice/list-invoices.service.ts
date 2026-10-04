import "server-only";
import { Types } from "mongoose";
import { listInvoicesQuerySchema } from "@/lib/validation/invoice";
import { Invoice } from "@/models/Invoice";
import { requireBusinessAccess } from "@/services/business/business-access.service";

export async function listInvoices(
  authenticatedUserId: string,
  businessId: string,
  input: unknown,
) {
  const { business } = await requireBusinessAccess(
    authenticatedUserId,
    businessId,
    "canManageInvoices",
  );

  const query = listInvoicesQuerySchema.parse(input);

  const filter = {
    businessId: business._id,

    ...(query.orderId !== undefined
      ? { orderId: new Types.ObjectId(query.orderId) }
      : {}),

    ...(query.invoiceNumber !== undefined
      ? { invoiceNumber: query.invoiceNumber }
      : {}),

    ...(query.status !== "All"
      ? { status: query.status }
      : {}),
  };

  const [records, total] = await Promise.all([
    Invoice.find(filter)
      .select(
        "_id businessId orderId invoiceNumber customerSnapshot.name subtotal totalAmount currency status issuedAt voidedAt createdAt updatedAt",
      )
      .sort({
        issuedAt: -1,
        _id: -1,
      })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .lean(),

    Invoice.countDocuments(filter),
  ]);

  return {
    invoices: records.map((invoice) => ({
      id: invoice._id.toString(),
      businessId: invoice.businessId.toString(),
      orderId: invoice.orderId.toString(),
      invoiceNumber: invoice.invoiceNumber,
      customerName: invoice.customerSnapshot.name,
      subtotal: invoice.subtotal,
      totalAmount: invoice.totalAmount,
      currency: invoice.currency,
      status: invoice.status,
      issuedAt: invoice.issuedAt,
      voidedAt: invoice.voidedAt,
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt,
    })),

    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };
}