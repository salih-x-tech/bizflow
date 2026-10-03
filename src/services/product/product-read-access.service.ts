import "server-only";
import { AppError } from "@/lib/errors";
import { requireBusinessAccess } from "@/services/business/business-access.service";

export async function requireProductReadAccess(
  authenticatedUserId: string,
  businessId: string,
) {
  const access = await requireBusinessAccess(
    authenticatedUserId,
    businessId,
  );

  const isOwner = access.membership.role === "Owner";

  const canManageProducts =
    isOwner ||
    access.membership.permissions.includes("canManageProducts");

  const canManageOrders =
    isOwner ||
    access.membership.permissions.includes("canManageOrders");

  const canManageInventory =
    isOwner ||
    access.membership.permissions.includes("canManageInventory");

  if (
    !canManageProducts &&
    !canManageOrders &&
    !canManageInventory
  ) {
    throw new AppError(
      "FORBIDDEN",
      "You do not have permission to view products.",
      403,
    );
  }

  return {
    ...access,
    canManageProducts,
    canManageOrders,
    canManageInventory,
  };
}