import "server-only";
import { Types } from "mongoose";
import { connectDB } from "@/lib/db/connect";
import { AppError } from "@/lib/errors";
import { AuditLog } from "@/models/AuditLog";
import { Business } from "@/models/Business";
import { BusinessMembership } from "@/models/BusinessMembership";
import { StaffInvitation } from "@/models/StaffInvitation";
import { requireBusinessOwner } from "@/services/business/business-owner.service";

export async function revokeStaffInvitation(
  authenticatedUserId: string,
  businessId: string,
  invitationId: string,
) {
  if (!/^[a-fA-F0-9]{24}$/.test(invitationId)) {
    throw new AppError(
      "INVALID_INVITATION_ID",
      "Enter a valid invitation ID.",
      400,
    );
  }

  const { business, membership } = await requireBusinessOwner(
    authenticatedUserId,
    businessId,
  );

  const invitationObjectId = new Types.ObjectId(invitationId);
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
          "Only the business owner can revoke invitations.",
          403,
        );
      }

      const invitation = await StaffInvitation.findOne({
        _id: invitationObjectId,
        businessId: business._id,
      })
        .select("_id status expiresAt")
        .session(databaseSession)
        .lean();

      if (!invitation) {
        throw new AppError(
          "INVITATION_NOT_FOUND",
          "Invitation was not found.",
          404,
        );
      }

      const now = new Date();

      if (
        invitation.status !== "Pending" ||
        invitation.expiresAt.getTime() <= now.getTime()
      ) {
        throw new AppError(
          "INVITATION_NOT_PENDING",
          "Only an unexpired Pending invitation can be revoked.",
          409,
        );
      }

      const revokedInvitation = await StaffInvitation.findOneAndUpdate(
        {
          _id: invitationObjectId,
          businessId: business._id,
          status: "Pending",
          expiresAt: { $gt: now },
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

      if (!revokedInvitation) {
        throw new AppError(
          "INVITATION_NOT_PENDING",
          "This invitation can no longer be revoked.",
          409,
        );
      }

      await AuditLog.create(
        [
          {
            scope: "Business",
            businessId: business._id,
            userId: membership.userId,
            action: "STAFF_INVITATION_REVOKED",
            entityType: "StaffInvitation",
            entityId: revokedInvitation._id,
            details: {},
          },
        ],
        {
          session: databaseSession,
        },
      );

      return {
        id: revokedInvitation._id.toString(),
        status: revokedInvitation.status,
      };
    },
    {
      readPreference: "primary",
    },
  );
}