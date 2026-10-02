import "server-only";
import { STAFF_INVITATION_DURATION_MS } from "@/lib/auth/invitation-config";
import { createAuthToken } from "@/lib/auth/tokens";
import { connectDB } from "@/lib/db/connect";
import { AppError } from "@/lib/errors";
import { createStaffInvitationSchema } from "@/lib/validation/staff";
import { AuditLog } from "@/models/AuditLog";
import { Business } from "@/models/Business";
import { BusinessMembership } from "@/models/BusinessMembership";
import { StaffInvitation } from "@/models/StaffInvitation";
import { User } from "@/models/User";
import { requireBusinessOwner } from "@/services/business/business-owner.service";

export async function createStaffInvitation(
  authenticatedUserId: string,
  businessId: string,
  input: unknown,
) {
  const data = createStaffInvitationSchema.parse(input);

  const { business, membership } = await requireBusinessOwner(
    authenticatedUserId,
    businessId,
  );

  const connection = await connectDB();

  await Promise.all([
    StaffInvitation.init(),
    AuditLog.init(),
  ]);

  const { token, tokenHash } = createAuthToken();

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
          "Only the business owner can invite staff.",
          403,
        );
      }

      const existingUser = await User.findOne({
        email: data.email,
      })
        .select("_id")
        .session(databaseSession)
        .lean();

      if (existingUser) {
        const activeMembership = await BusinessMembership.exists({
          businessId: business._id,
          userId: existingUser._id,
          status: "Active",
        }).session(databaseSession);

        if (activeMembership) {
          throw new AppError(
            "ALREADY_BUSINESS_MEMBER",
            "This user is already an active business member.",
            409,
          );
        }
      }

      const expiresAt = new Date(
        Date.now() + STAFF_INVITATION_DURATION_MS,
      );

      const [invitation] = await StaffInvitation.create(
        [
          {
            businessId: business._id,
            email: data.email,
            invitedBy: membership.userId,
            permissions: data.permissions,
            status: "Pending",
            tokenHash,
            expiresAt,
          },
        ],
        {
          session: databaseSession,
        },
      );

      if (!invitation) {
        throw new Error("Staff invitation creation failed.");
      }

      await AuditLog.create(
        [
          {
            scope: "Business",
            businessId: business._id,
            userId: membership.userId,
            action: "STAFF_INVITATION_CREATED",
            entityType: "StaffInvitation",
            entityId: invitation._id,
            details: {
              permissions: data.permissions,
            },
          },
        ],
        {
          session: databaseSession,
        },
      );

      return {
        invitation: {
          id: invitation._id.toString(),
          businessId: business._id.toString(),
          email: invitation.email,
          invitedBy: invitation.invitedBy.toString(),
          permissions: invitation.permissions,
          status: invitation.status,
          expiresAt: invitation.expiresAt,
          createdAt: invitation.createdAt,
        },
        token,
      };
    },
    {
      readPreference: "primary",
    },
  );
}