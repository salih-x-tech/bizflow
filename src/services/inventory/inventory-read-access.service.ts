import "server-only";
import { AppError } from "@/lib/errors";
import { requireBusinessAccess } from "@/services/business/business-access.service";

export async function requireInventoryReadAccess(
  authenticatedUserId: string,
  businessId: string,
) {
  const access = await requireBusinessAccess(
    authenticatedUserId,
    businessId,
  );

  const { membership } = access;
  const isOwner = membership.role === "Owner";

  const canManageInventory =
    isOwner ||
    membership.permissions.includes("canManageInventory");

  const canManageOrders =
    isOwner ||
    membership.permissions.includes("canManageOrders");

  if (!canManageInventory && !canManageOrders) {
    throw new AppError(
      "FORBIDDEN",
      "You do not have permission to view inventory.",
      403,
    );
  }

  return {
    ...access,
    canManageInventory,
    canManageOrders,
  };
}