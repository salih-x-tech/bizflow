import "server-only";
import { StaffInvitation } from "@/models/StaffInvitation";
import { requireBusinessOwner } from "@/services/business/business-owner.service";

export async function listStaffInvitations(
  authenticatedUserId: string,
  businessId: string,
) {
  const { business } = await requireBusinessOwner(
    authenticatedUserId,
    businessId,
  );

  const invitations = await StaffInvitation.find({
    businessId: business._id,
  })
    .select(
      "_id email invitedBy permissions status expiresAt createdAt updatedAt",
    )
    .sort({ createdAt: -1, _id: -1 })
    .lean();

  const now = Date.now();

  return invitations.map((invitation) => {
    const status =
      invitation.status === "Pending" &&
      invitation.expiresAt.getTime() <= now
        ? "Expired"
        : invitation.status;

    return {
      id: invitation._id.toString(),
      email: invitation.email,
      invitedBy: invitation.invitedBy.toString(),
      permissions: invitation.permissions,
      status,
      expiresAt: invitation.expiresAt,
      createdAt: invitation.createdAt,
      updatedAt: invitation.updatedAt,
    };
  });
}