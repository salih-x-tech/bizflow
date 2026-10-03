import "server-only";
import { Types } from "mongoose";
import { connectDB } from "@/lib/db/connect";
import { AppError } from "@/lib/errors";
import { updateStaffPermissionsSchema } from "@/lib/validation/staff";
import { AuditLog } from "@/models/AuditLog";
import { Business } from "@/models/Business";
import { BusinessMembership } from "@/models/BusinessMembership";
import { requireBusinessOwner } from "@/services/business/business-owner.service";

export async function updateStaffPermissions(
  authenticatedUserId: string,
  businessId: string,
  membershipId: string,
  input: unknown,
) {
  if (!/^[a-fA-F0-9]{24}$/.test(membershipId)) {
    throw new AppError(
      "INVALID_MEMBERSHIP_ID",
      "Enter a valid membership ID.",
      400,
    );
  }

  const data = updateStaffPermissionsSchema.parse(input);

  const { business, membership } = await requireBusinessOwner(
    authenticatedUserId,
    businessId,
  );

  const targetId = new Types.ObjectId(membershipId);
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

      const ownedBusiness = await Business.exists({
        _id: business._id,
        ownerId: membership.userId,
      }).session(databaseSession);

      if (!ownerMembership || !ownedBusiness) {
        throw new AppError(
          "FORBIDDEN",
          "Only the business owner can update staff permissions.",
          403,
        );
      }

      const target = await BusinessMembership.findOne({
        _id: targetId,
        businessId: business._id,
        role: "Staff",
      })
        .select("_id status permissions")
        .session(databaseSession)
        .lean();

      if (!target) {
        throw new AppError(
          "STAFF_NOT_FOUND",
          "Staff membership was not found.",
          404,
        );
      }

      if (target.status !== "Active") {
        throw new AppError(
          "STAFF_NOT_ACTIVE",
          "Only active staff memberships can be updated.",
          409,
        );
      }

      const updatedMembership = await BusinessMembership.findOneAndUpdate(
        {
          _id: targetId,
          businessId: business._id,
          role: "Staff",
          status: "Active",
        },
        {
          $set: {
            permissions: data.permissions,
          },
        },
        {
          session: databaseSession,
          returnDocument: "after",
          runValidators: true,
        },
      );

      if (!updatedMembership) {
        throw new AppError(
          "STAFF_NOT_ACTIVE",
          "This staff membership can no longer be updated.",
          409,
        );
      }

      await AuditLog.create(
        [
          {
            scope: "Business",
            businessId: business._id,
            userId: membership.userId,
            action: "STAFF_PERMISSIONS_UPDATED",
            entityType: "BusinessMembership",
            entityId: updatedMembership._id,
            details: {
              previousPermissions: target.permissions,
              permissions: data.permissions,
            },
          },
        ],
        {
          session: databaseSession,
        },
      );

      return {
        id: updatedMembership._id.toString(),
        userId: updatedMembership.userId.toString(),
        role: updatedMembership.role,
        status: updatedMembership.status,
        permissions: updatedMembership.permissions,
        updatedAt: updatedMembership.updatedAt,
      };
    },
    {
      readPreference: "primary",
    },
  );
}