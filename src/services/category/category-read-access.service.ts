import "server-only";
import { AppError } from "@/lib/errors";
import { requireBusinessAccess } from "@/services/business/business-access.service";

export async function requireCategoryReadAccess(
  authenticatedUserId: string,
  businessId: string,
) {
  const access = await requireBusinessAccess(
    authenticatedUserId,
    businessId,
  );

  const canManageCategories =
    access.membership.role === "Owner" ||
    access.membership.permissions.includes("canManageCategories");

  const canReadCategories =
    canManageCategories ||
    access.membership.permissions.includes("canManageProducts");

  if (!canReadCategories) {
    throw new AppError(
      "FORBIDDEN",
      "You do not have permission to view categories.",
      403,
    );
  }

  return {
    ...access,
    canManageCategories,
  };
}