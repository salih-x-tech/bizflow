import "server-only";
import { Types } from "mongoose";
import { connectDB } from "@/lib/db/connect";
import { AppError } from "@/lib/errors";
import { AuditLog } from "@/models/AuditLog";
import { Business } from "@/models/Business";
import { BusinessMembership } from "@/models/BusinessMembership";
import { StaffInvitation } from "@/models/StaffInvitation";
import { User } from "@/models/User";
import { requireBusinessOwner } from "@/services/business/business-owner.service";

export async function removeStaff(
  authenticatedUserId: string,
  businessId: string,
  membershipId: string,
) {
  if (!/^[a-fA-F0-9]{24}$/.test(membershipId)) {
    throw new AppError(
      "INVALID_MEMBERSHIP_ID",
      "Enter a valid membership ID.",
      400,
    );
  }

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
          "Only the business owner can remove staff.",
          403,
        );
      }

      const target = await BusinessMembership.findOne({
        _id: targetId,
        businessId: business._id,
        role: "Staff",
      })
        .select("_id userId status")
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
          "This staff membership is already revoked.",
          409,
        );
      }

      const revokedMembership = await BusinessMembership.findOneAndUpdate(
        {
          _id: targetId,
          businessId: business._id,
          role: "Staff",
          status: "Active",
        },
        {
          $set: { status: "Revoked" },
        },
        {
          session: databaseSession,
          returnDocument: "after",
          runValidators: true,
        },
      );

      if (!revokedMembership) {
        throw new AppError(
          "STAFF_NOT_ACTIVE",
          "This staff membership can no longer be removed.",
          409,
        );
      }

      const staffUser = await User.findById(target.userId)
        .select("email")
        .session(databaseSession)
        .lean();

      const now = new Date();

      const pendingInvitations = staffUser
        ? await StaffInvitation.find({
            businessId: business._id,
            email: staffUser.email,
            status: "Pending",
            expiresAt: { $gt: now },
          })
            .select("_id")
            .session(databaseSession)
            .lean()
        : [];

      if (pendingInvitations.length > 0) {
        const result = await StaffInvitation.updateMany(
          {
            _id: {
              $in: pendingInvitations.map((invitation) => invitation._id),
            },
            businessId: business._id,
            status: "Pending",
            expiresAt: { $gt: now },
          },
          {
            $set: { status: "Revoked" },
          },
          {
            session: databaseSession,
            runValidators: true,
          },
        );

        if (result.modifiedCount !== pendingInvitations.length) {
          throw new Error("Pending invitation revocation failed.");
        }
      }

      await AuditLog.create(
        [
          {
            scope: "Business",
            businessId: business._id,
            userId: membership.userId,
            action: "STAFF_REMOVED",
            entityType: "BusinessMembership",
            entityId: revokedMembership._id,
            details: {},
          },
          ...pendingInvitations.map((invitation) => ({
            scope: "Business" as const,
            businessId: business._id,
            userId: membership.userId,
            action: "STAFF_INVITATION_REVOKED",
            entityType: "StaffInvitation",
            entityId: invitation._id,
            details: {
              reason: "Staff membership revoked",
            },
          })),
        ],
        {
          session: databaseSession,
        },
      );

      return {
        id: revokedMembership._id.toString(),
        userId: revokedMembership.userId.toString(),
        role: revokedMembership.role,
        status: revokedMembership.status,
        revokedInvitationCount: pendingInvitations.length,
      };
    },
    {
      readPreference: "primary",
    },
  );
}