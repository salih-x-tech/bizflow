import "server-only";
import { Types } from "mongoose";
import { connectDB } from "@/lib/db/connect";
import { AppError } from "@/lib/errors";
import { Business } from "@/models/Business";
import { BusinessMembership } from "@/models/BusinessMembership";

export async function listBusinesses(authenticatedUserId: string) {
  if (!/^[a-fA-F0-9]{24}$/.test(authenticatedUserId)) {
    throw new AppError(
      "UNAUTHENTICATED",
      "Please log in to continue.",
      401,
    );
  }

  await connectDB();

  const userId = new Types.ObjectId(authenticatedUserId);

  const memberships = await BusinessMembership.find({
    userId,
    status: "Active",
  })
    .select("businessId role permissions")
    .lean();

  if (memberships.length === 0) {
    return [];
  }

  const businesses = await Business.find({
    _id: {
      $in: memberships.map((membership) => membership.businessId),
    },
  })
    .select("_id name currency businessType createdAt")
    .sort({ createdAt: -1, _id: -1 })
    .lean();

  const membershipByBusinessId = new Map(
    memberships.map((membership) => [
      membership.businessId.toString(),
      membership,
    ]),
  );

  return businesses.map((business) => {
    const membership = membershipByBusinessId.get(
      business._id.toString(),
    );

    if (!membership) {
      throw new Error("Business membership was not found.");
    }

    return {
      id: business._id.toString(),
      name: business.name,
      currency: business.currency,
      businessType: business.businessType,
      role: membership.role,
      permissions: membership.permissions,
      createdAt: business.createdAt,
    };
  });
}