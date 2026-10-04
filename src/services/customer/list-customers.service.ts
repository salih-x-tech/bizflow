import "server-only";
import { AppError } from "@/lib/errors";
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
  const { business, membership } = await requireBusinessAccess(
    authenticatedUserId,
    businessId,
  );

  const isOwner = membership.role === "Owner";

  const canManageCustomers =
    isOwner ||
    membership.permissions.includes("canManageCustomers");

  const canManageOrders =
    isOwner ||
    membership.permissions.includes("canManageOrders");

  if (!canManageCustomers && !canManageOrders) {
    throw new AppError(
      "FORBIDDEN",
      "You do not have permission to view customers.",
      403,
    );
  }

  const query = listCustomersQuerySchema.parse(input);

  if (!canManageCustomers && query.status !== "Active") {
    throw new AppError(
      "FORBIDDEN",
      "Order lookups may only list active customers.",
      403,
    );
  }

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

  const fields = canManageCustomers
    ? "_id businessId name email phone address notes status createdAt updatedAt"
    : "_id name email phone";

  const [customers, total] = await Promise.all([
    Customer.find(filter)
      .select(fields)
      .sort({ createdAt: -1, _id: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .lean(),

    Customer.countDocuments(filter),
  ]);

  return {
    customers: customers.map((customer) => {
      if (!canManageCustomers) {
        return {
          id: customer._id.toString(),
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
        };
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
    }),

    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };
}