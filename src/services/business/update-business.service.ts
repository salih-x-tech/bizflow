import "server-only";
import { connectDB } from "@/lib/db/connect";
import { AppError } from "@/lib/errors";
import { updateBusinessSchema } from "@/lib/validation/business";
import { AuditLog } from "@/models/AuditLog";
import { Business } from "@/models/Business";
import { BusinessMembership } from "@/models/BusinessMembership";
import { requireBusinessAccess } from "@/services/business/business-access.service";

export async function updateBusiness(
  authenticatedUserId: string,
  businessId: string,
  input: unknown,
) {
  const data = updateBusinessSchema.parse(input);

  const { business, membership } = await requireBusinessAccess(
    authenticatedUserId,
    businessId,
  );

  if (membership.role !== "Owner") {
    throw new AppError(
      "FORBIDDEN",
      "Only the business owner can update the business profile.",
      403,
    );
  }

  const setFields: Record<string, string> = {};
  const unsetFields: Record<string, ""> = {};

  for (const field of ["name", "businessType"] as const) {
    const value = data[field];

    if (value !== undefined) {
      setFields[field] = value;
    }
  }

  for (const field of [
    "contactEmail",
    "contactPhone",
    "address",
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
  await AuditLog.init();

  return connection.connection.transaction(
    async (databaseSession) => {
      const ownerMembership = await BusinessMembership.exists({
        businessId: business._id,
        userId: membership.userId,
        role: "Owner",
        status: "Active",
      }).session(databaseSession);

      if (!ownerMembership) {
        throw new AppError(
          "FORBIDDEN",
          "Only the business owner can update the business profile.",
          403,
        );
      }

      const updatedBusiness = await Business.findOneAndUpdate(
        {
          _id: business._id,
          ownerId: membership.userId,
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

      if (!updatedBusiness) {
        throw new AppError(
          "BUSINESS_NOT_FOUND",
          "Business was not found.",
          404,
        );
      }

      await AuditLog.create(
        [
          {
            scope: "Business",
            businessId: updatedBusiness._id,
            userId: membership.userId,
            action: "BUSINESS_UPDATED",
            entityType: "Business",
            entityId: updatedBusiness._id,
            details: {
              fields: Object.keys(data),
            },
          },
        ],
        {
          session: databaseSession,
        },
      );

      return {
        id: updatedBusiness._id.toString(),
        ownerId: updatedBusiness.ownerId.toString(),
        name: updatedBusiness.name,
        currency: updatedBusiness.currency,
        businessType: updatedBusiness.businessType,
        contactEmail: updatedBusiness.contactEmail,
        contactPhone: updatedBusiness.contactPhone,
        address: updatedBusiness.address,
        createdAt: updatedBusiness.createdAt,
        updatedAt: updatedBusiness.updatedAt,
      };
    },
    {
      readPreference: "primary",
    },
  );
}