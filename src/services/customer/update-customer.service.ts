import "server-only";
import { Types } from "mongoose";
import { connectDB } from "@/lib/db/connect";
import { AppError } from "@/lib/errors";
import { updateCustomerSchema } from "@/lib/validation/customer";
import { AuditLog } from "@/models/AuditLog";
import { Customer } from "@/models/Customer";
import { requireBusinessAccess } from "@/services/business/business-access.service";
import { assertTransactionPermission } from "@/services/business/transaction-permission.service";

export async function updateCustomer(
  authenticatedUserId: string,
  businessId: string,
  customerId: string,
  input: unknown,
) {
  const { business, membership } = await requireBusinessAccess(
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

  const data = updateCustomerSchema.parse(input);
  const customerObjectId = new Types.ObjectId(customerId);
  const setFields: Record<string, string> = {};
  const unsetFields: Record<string, ""> = {};

  for (const field of ["name", "status"] as const) {
    const value = data[field];

    if (value !== undefined) {
      setFields[field] = value;
    }
  }

  for (const field of [
    "email",
    "phone",
    "address",
    "notes",
  ] as const) {
    if (!Object.prototype.hasOwnProperty.call(data, field)) {
      continue;
    }

    const value = data[field];

    if (value === undefined) {
      unsetFields[field] = "";
    } else {
      setFields[field] = value;
    }
  }

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

        const existingCustomer = await Customer.findOne({
          _id: customerObjectId,
          businessId: business._id,
        })
          .select("status")
          .session(databaseSession)
          .lean();

        if (!existingCustomer) {
          throw new AppError(
            "CUSTOMER_NOT_FOUND",
            "Customer was not found.",
            404,
          );
        }

        const customer = await Customer.findOneAndUpdate(
          {
            _id: customerObjectId,
            businessId: business._id,
          },
          {
            ...(Object.keys(setFields).length > 0
              ? { $set: setFields }
              : {}),
            ...(Object.keys(unsetFields).length > 0
              ? { $unset: unsetFields }
              : {}),
          },
          {
            session: databaseSession,
            returnDocument: "after",
            runValidators: true,
          },
        );

        if (!customer) {
          throw new AppError(
            "CUSTOMER_NOT_FOUND",
            "Customer was not found.",
            404,
          );
        }

        const statusChanged =
          existingCustomer.status !== customer.status;

        const action = statusChanged
          ? customer.status === "Archived"
            ? "CUSTOMER_ARCHIVED"
            : "CUSTOMER_RESTORED"
          : "CUSTOMER_UPDATED";

        await AuditLog.create(
          [
            {
              scope: "Business",
              businessId: business._id,
              userId: membership.userId,
              action,
              entityType: "Customer",
              entityId: customer._id,
              details: {
                fields: Object.keys(data),
                previousStatus: existingCustomer.status,
                status: customer.status,
              },
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