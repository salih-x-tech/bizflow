import "server-only";
import { connectDB } from "@/lib/db/connect";
import { AppError } from "@/lib/errors";
import { createCustomerSchema } from "@/lib/validation/customer";
import { AuditLog } from "@/models/AuditLog";
import { Customer } from "@/models/Customer";
import { requireBusinessAccess } from "@/services/business/business-access.service";
import { assertTransactionPermission } from "@/services/business/transaction-permission.service";

export async function createCustomer(
  authenticatedUserId: string,
  businessId: string,
  input: unknown,
) {
  const { business, membership } = await requireBusinessAccess(
    authenticatedUserId,
    businessId,
    "canManageCustomers",
  );

  const data = createCustomerSchema.parse(input);
  const connection = await connectDB();

  await Promise.all([
    Customer.init(),
    AuditLog.init(),
  ]);

  try {
    return await connection.connection.transaction(
      async (databaseSession) => {
        await assertTransactionPermission(
          membership.userId,
          business._id,
          "canManageCustomers",
          databaseSession,
        );

        const [customer] = await Customer.create(
          [
            {
              ...data,
              businessId: business._id,
              status: "Active",
            },
          ],
          {
            session: databaseSession,
          },
        );

        if (!customer) {
          throw new Error("Customer creation failed.");
        }

        await AuditLog.create(
          [
            {
              scope: "Business",
              businessId: business._id,
              userId: membership.userId,
              action: "CUSTOMER_CREATED",
              entityType: "Customer",
              entityId: customer._id,
              details: {},
            },
          ],
          {
            session: databaseSession,
          },
        );

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
      },
      {
        readPreference: "primary",
      },
    );
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    ) {
      throw new AppError(
        "CUSTOMER_EMAIL_ALREADY_EXISTS",
        "A customer with this email already exists in this business.",
        409,
        [
          {
            field: "email",
            issue: "Email must be unique within the business.",
          },
        ],
      );
    }

    throw error;
  }
}