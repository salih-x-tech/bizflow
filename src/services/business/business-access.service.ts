import "server-only";
import { Types } from "mongoose";
import { connectDB } from "@/lib/db/connect";
import { AppError } from "@/lib/errors";
import type { BusinessPermission } from "@/lib/permissions";
import { Business } from "@/models/Business";
import { BusinessMembership } from "@/models/BusinessMembership";

export async function requireBusinessAccess(
  authenticatedUserId: string,
  businessId: string,
  permission?: BusinessPermission,
) {
  if (!/^[a-fA-F0-9]{24}$/.test(authenticatedUserId)) {
    throw new AppError(
      "UNAUTHENTICATED",
      "Please log in to continue.",
      401,
    );
  }

  if (!/^[a-fA-F0-9]{24}$/.test(businessId)) {
    throw new AppError(
      "INVALID_BUSINESS_ID",
      "Enter a valid business ID.",
      400,
    );
  }

  await connectDB();

  const businessObjectId = new Types.ObjectId(businessId);
  const userId = new Types.ObjectId(authenticatedUserId);

  const membership = await BusinessMembership.findOne({
    businessId: businessObjectId,
    userId,
    status: "Active",
  })
    .select("_id businessId userId role permissions")
    .lean();

  if (!membership) {
    throw new AppError(
      "BUSINESS_NOT_FOUND",
      "Business was not found.",
      404,
    );
  }

  const business = await Business.findById(businessObjectId)
    .select(
      "_id ownerId name currency businessType contactEmail contactPhone address createdAt updatedAt",
    )
    .lean();

  if (!business) {
    throw new AppError(
      "BUSINESS_NOT_FOUND",
      "Business was not found.",
      404,
    );
  }

  if (
    permission &&
    membership.role !== "Owner" &&
    !membership.permissions.includes(permission)
  ) {
    throw new AppError(
      "FORBIDDEN",
      "You do not have permission to perform this action.",
      403,
    );
  }

  return {
    business,
    membership,
  };
}