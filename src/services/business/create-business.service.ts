import "server-only";
import { Types } from "mongoose";
import { connectDB } from "@/lib/db/connect";
import { AppError } from "@/lib/errors";
import { BUSINESS_PERMISSIONS } from "@/lib/permissions";
import { createBusinessSchema } from "@/lib/validation/business";
import { AuditLog } from "@/models/AuditLog";
import { Business } from "@/models/Business";
import { BusinessMembership } from "@/models/BusinessMembership";
import { User } from "@/models/User";

export async function createBusiness(
  authenticatedUserId: string,
  input: unknown,
) {
  if (!/^[a-fA-F0-9]{24}$/.test(authenticatedUserId)) {
    throw new AppError(
      "UNAUTHENTICATED",
      "Please log in to continue.",
      401,
    );
  }

  const data = createBusinessSchema.parse(input);
  const ownerId = new Types.ObjectId(authenticatedUserId);
  const connection = await connectDB();

  await Promise.all([
    Business.init(),
    BusinessMembership.init(),
    AuditLog.init(),
  ]);

  return connection.connection.transaction(
    async (databaseSession) => {
      const activeUser = await User.exists({
        _id: ownerId,
        status: "Active",
      }).session(databaseSession);

      if (!activeUser) {
        throw new AppError(
          "UNAUTHENTICATED",
          "Please log in to continue.",
          401,
        );
      }

      const [business] = await Business.create(
        [
          {
            ...data,
            ownerId,
          },
        ],
        {
          session: databaseSession,
        },
      );

      if (!business) {
        throw new Error("Business creation failed.");
      }

      await BusinessMembership.create(
        [
          {
            userId: ownerId,
            businessId: business._id,
            role: "Owner",
            permissions: [...BUSINESS_PERMISSIONS],
            status: "Active",
          },
        ],
        {
          session: databaseSession,
        },
      );

      await AuditLog.create(
        [
          {
            scope: "Business",
            businessId: business._id,
            userId: ownerId,
            action: "BUSINESS_CREATED",
            entityType: "Business",
            entityId: business._id,
            details: {},
          },
        ],
        {
          session: databaseSession,
        },
      );

      return {
        id: business._id.toString(),
        ownerId: ownerId.toString(),
        name: business.name,
        currency: business.currency,
        businessType: business.businessType,
        contactEmail: business.contactEmail,
        contactPhone: business.contactPhone,
        address: business.address,
        createdAt: business.createdAt,
      };
    },
    {
      readPreference: "primary",
    },
  );
}