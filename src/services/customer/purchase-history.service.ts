import "server-only";
import { Types } from "mongoose";
import { getCustomer } from "@/services/customer/get-customer.service";
import { Order } from "@/models/Order";
import { z } from "zod";

export async function getCustomerPurchaseHistory(userId: string, businessId: string, customerId: string, input: unknown) {
  const customer = await getCustomer(userId, businessId, customerId);
  const { page } = z.object({ page: z.coerce.number().int().min(1).max(10000).default(1) }).parse(input);
  const filter = { businessId: new Types.ObjectId(customer.businessId), customerId: new Types.ObjectId(customer.id) };
  const [records, total] = await Promise.all([
    Order.find(filter).select("_id status totalAmount items createdAt").sort({ createdAt: -1, _id: -1 }).skip((page - 1) * 20).limit(20).lean(),
    Order.countDocuments(filter),
  ]);
  return { orders: records.map((order) => ({ id: order._id.toString(), status: order.status, totalAmount: order.totalAmount, createdAt: order.createdAt, items: order.items.map((item) => ({ name: item.productNameSnapshot, quantity: item.quantity, unitPrice: item.unitPriceAtOrder, lineTotal: item.lineTotal })) })), pagination: { page, total, totalPages: Math.ceil(total / 20) } };
}
