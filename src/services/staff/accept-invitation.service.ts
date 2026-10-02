import "server-only";
import { Types } from "mongoose";
import { hashToken } from "@/lib/auth/tokens";
import { connectDB } from "@/lib/db/connect";
import { AppError } from "@/lib/errors";
import { acceptStaffInvitationSchema } from "@/lib/validation/staff";
import { AuditLog } from "@/models/AuditLog";
import { Business } from "@/models/Business";
import { BusinessMembership } from "@/models/BusinessMembership";
import { StaffInvitation } from "@/models/StaffInvitation";
import { User } from "@/models/User";

function invalidInvitation(): AppError {
  return new AppError(
    "INVALID_INVITATION",
    "This invitation is invalid, unavailable, or has expired.",
    400,
  );
}

export async function acceptStaffInvitation(
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

  const data = acceptStaffInvitationSchema.parse(input);
  const userId = new Types.ObjectId(authenticatedUserId);
  const tokenHash = hashToken(data.token);
  const connection = await connectDB();

  await Promise.all([
    BusinessMembership.init(),
    AuditLog.init(),
  ]);

  return connection.connection.transaction(
    async (databaseSession) => {
      const user = await User.findOne({
        _id: userId,
        status: "Active",
      })
        .select("_id email")
        .session(databaseSession)
        .lean();

      if (!user) {
        throw new AppError(
          "UNAUTHENTICATED",
          "Please log in to continue.",
          401,
        );
      }

      const invitation = await StaffInvitation.findOneAndUpdate(
        {
          tokenHash,
          email: user.email,
          status: "Pending",
          expiresAt: { $gt: new Date() },
        },
        {
          $set: { status: "Accepted" },
        },
        {
          session: databaseSession,
          returnDocument: "before",
          runValidators: true,
        },
      ).select("_id businessId permissions");

      if (!invitation) {
        throw invalidInvitation();
      }

      const business = await Business.findById(invitation.businessId)
        .select("_id ownerId name")
        .session(databaseSession)
        .lean();

      if (!business) {
        throw invalidInvitation();
      }

      const existingMembership = await BusinessMembership.findOne({
        businessId: business._id,
        userId,
      })
        .select("_id role status")
        .session(databaseSession)
        .lean();

      if (
        business.ownerId.equals(userId) ||
        existingMembership?.role === "Owner" ||
        existingMembership?.status === "Active"
      ) {
        throw new AppError(
          "ALREADY_BUSINESS_MEMBER",
          "You are already an active business member.",
          409,
        );
      }

      let membershipId: Types.ObjectId;

      if (existingMembership) {
        const result = await BusinessMembership.updateOne(
          {
            _id: existingMembership._id,
            businessId: business._id,
            userId,
            role: "Staff",
            status: "Revoked",
          },
          {
            $set: {
              status: "Active",
              permissions: invitation.permissions,
            },
          },
          {
            session: databaseSession,
            runValidators: true,
          },
        );

        if (result.modifiedCount !== 1) {
          throw invalidInvitation();
        }

        membershipId = existingMembership._id;
      } else {
        const [membership] = await BusinessMembership.create(
          [
            {
              businessId: business._id,
              userId,
              role: "Staff",
              status: "Active",
              permissions: invitation.permissions,
            },
          ],
          {
            session: databaseSession,
          },
        );

        if (!membership) {
          throw new Error("Staff membership creation failed.");
        }

        membershipId = membership._id;
      }

      await AuditLog.create(
        [
          {
            scope: "Business",
            businessId: business._id,
            userId,
            action: "STAFF_INVITATION_ACCEPTED",
            entityType: "StaffInvitation",
            entityId: invitation._id,
            details: {
              membershipId: membershipId.toString(),
            },
          },
        ],
        {
          session: databaseSession,
        },
      );

      return {
        business: {
          id: business._id.toString(),
          name: business.name,
        },
        membership: {
          id: membershipId.toString(),
          role: "Staff",
          status: "Active",
          permissions: invitation.permissions,
        },
      };
    },
    {
      readPreference: "primary",
    },
  );
}