import "server-only";
import type { ClientSession, Types } from "mongoose";
import { AppError } from "@/lib/errors";
import type { BusinessPermission } from "@/lib/permissions";
import { Business } from "@/models/Business";
import { BusinessMembership } from "@/models/BusinessMembership";
import { User } from "@/models/User";

export async function assertTransactionPermission(
  userId: Types.ObjectId,
  businessId: Types.ObjectId,
  permission: BusinessPermission,
  databaseSession: ClientSession,
): Promise<void> {
  const activeUser = await User.exists({
    _id: userId,
    status: "Active",
  }).session(databaseSession);

  if (!activeUser) {
    throw new AppError(
      "UNAUTHENTICATED",
      "Please log in to continue.",
      401,
    );
  }

  const membership = await BusinessMembership.findOne({
    userId,
    businessId,
    status: "Active",
  })
    .select("role permissions")
    .session(databaseSession)
    .lean();

  if (!membership) {
    throw new AppError(
      "BUSINESS_NOT_FOUND",
      "Business was not found.",
      404,
    );
  }

  const business = await Business.findById(businessId)
    .select("ownerId")
    .session(databaseSession)
    .lean();

  if (!business) {
    throw new AppError(
      "BUSINESS_NOT_FOUND",
      "Business was not found.",
      404,
    );
  }

  const allowed =
    membership.role === "Owner"
      ? business.ownerId.equals(userId)
      : membership.permissions.includes(permission);

  if (!allowed) {
    throw new AppError(
      "FORBIDDEN",
      "You do not have permission to perform this action.",
      403,
    );
  }
}