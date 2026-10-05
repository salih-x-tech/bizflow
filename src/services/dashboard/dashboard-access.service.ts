import "server-only";
import { requireBusinessAccess } from "@/services/business/business-access.service";

export async function requireDashboardAccess(
  authenticatedUserId: string,
  businessId: string,
) {
  const access = await requireBusinessAccess(
    authenticatedUserId,
    businessId,
    "canViewDashboard",
  );

  const { membership } = access;
  const isOwner = membership.role === "Owner";

  return {
    ...access,

    canViewRecentOrders:
      isOwner ||
      membership.permissions.includes("canManageOrders"),

    canViewRevenue:
      isOwner ||
      membership.permissions.includes("canViewReports"),

    canViewLowStock:
      isOwner ||
      membership.permissions.includes("canManageInventory"),
  };
}