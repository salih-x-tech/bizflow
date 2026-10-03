import "server-only";
import { Types } from "mongoose";
import { AppError } from "@/lib/errors";
import { Customer } from "@/models/Customer";
import { requireBusinessAccess } from "@/services/business/business-access.service";

export async function getCustomer(
  authenticatedUserId: string,
  businessId: string,
  customerId: string,
) {
  const { business } = await requireBusinessAccess(
    authenticatedUserId,
    businessId,
    "canManageCustomers",
  );

  if (!/^[a-fA-F0-9]{24}$/.test(customerId)) {
    throw new AppError(
      "INVALID_CUSTOMER_ID",
      "Enter a valid customer ID.",
      400,
    );
  }

  const customer = await Customer.findOne({
    _id: new Types.ObjectId(customerId),
    businessId: business._id,
  })
    .select(
      "_id businessId name email phone address notes status createdAt updatedAt",
    )
    .lean();

  if (!customer) {
    throw new AppError(
      "CUSTOMER_NOT_FOUND",
      "Customer was not found.",
      404,
    );
  }

  return {
    id: customer._id.toString(),
    businessId: customer.businessId.toString(),
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    address: customer.address,
    notes: customer.notes,
    status: customer.status,
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt,
  };
}