import "server-only";
import { AppError } from "@/lib/errors";
import { requireBusinessAccess } from "@/services/business/business-access.service";

export async function requireBusinessOwner(
  authenticatedUserId: string,
  businessId: string,
) {
  const access = await requireBusinessAccess(
    authenticatedUserId,
    businessId,
  );

  const isOwner =
    access.membership.role === "Owner" &&
    access.business.ownerId.equals(access.membership.userId);

  if (!isOwner) {
    throw new AppError(
      "FORBIDDEN",
      "Only the business owner can perform this action.",
      403,
    );
  }

  return access;
}