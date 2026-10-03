import "server-only";
import { listCustomersQuerySchema } from "@/lib/validation/customer";
import { Customer } from "@/models/Customer";
import { requireBusinessAccess } from "@/services/business/business-access.service";

function literalSearch(value: string): RegExp {
  const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(escaped, "i");
}

export async function listCustomers(
  authenticatedUserId: string,
  businessId: string,
  input: unknown,
) {
  const { business } = await requireBusinessAccess(
    authenticatedUserId,
    businessId,
    "canManageCustomers",
  );

  const query = listCustomersQuerySchema.parse(input);

  const filter = {
    businessId: business._id,

    ...(query.status !== "All"
      ? { status: query.status }
      : {}),

    ...(query.name
      ? { name: literalSearch(query.name) }
      : {}),

    ...(query.email
      ? { email: literalSearch(query.email) }
      : {}),

    ...(query.phone
      ? { phone: literalSearch(query.phone) }
      : {}),

    ...(query.search
      ? {
          $or: [
            { name: literalSearch(query.search) },
            { email: literalSearch(query.search) },
            { phone: literalSearch(query.search) },
          ],
        }
      : {}),
  };

  const [customers, total] = await Promise.all([
    Customer.find(filter)
      .select(
        "_id businessId name email phone address notes status createdAt updatedAt",
      )
      .sort({ createdAt: -1, _id: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .lean(),

    Customer.countDocuments(filter),
  ]);

  return {
    customers: customers.map((customer) => ({
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
    })),

    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };
}