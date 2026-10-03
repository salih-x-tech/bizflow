import "server-only";
import { BusinessMembership } from "@/models/BusinessMembership";
import { User } from "@/models/User";
import { requireBusinessOwner } from "@/services/business/business-owner.service";

export async function listStaff(
  authenticatedUserId: string,
  businessId: string,
) {
  const { business } = await requireBusinessOwner(
    authenticatedUserId,
    businessId,
  );

  const memberships = await BusinessMembership.find({
    businessId: business._id,
    role: "Staff",
  })
    .select("_id userId role status permissions createdAt updatedAt")
    .sort({ createdAt: -1, _id: -1 })
    .lean();

  if (memberships.length === 0) {
    return [];
  }

  const users = await User.find({
    _id: {
      $in: memberships.map((membership) => membership.userId),
    },
  })
    .select("_id name email status")
    .lean();

  const userById = new Map(
    users.map((user) => [user._id.toString(), user]),
  );

  return memberships.map((membership) => {
    const user = userById.get(membership.userId.toString());

    return {
      id: membership._id.toString(),
      userId: membership.userId.toString(),
      user: user
        ? {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            status: user.status,
          }
        : null,
      role: membership.role,
      status: membership.status,
      permissions: membership.permissions,
      createdAt: membership.createdAt,
      updatedAt: membership.updatedAt,
    };
  });
}