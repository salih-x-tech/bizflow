import { apiError, apiSuccess } from "@/lib/api/response";
import { requireUser } from "@/lib/auth/require-user";
import { requireBusinessAccess } from "@/services/business/business-access.service";

export const runtime = "nodejs";

type BusinessRouteContext = {
  params: Promise<{ businessId: string }>;
};

export async function GET(
  _request: Request,
  context: BusinessRouteContext,
) {
  try {
    const user = await requireUser();
    const { businessId } = await context.params;

    const { business, membership } = await requireBusinessAccess(
      user.id,
      businessId,
    );

    return apiSuccess({
      business: {
        id: business._id.toString(),
        ownerId: business.ownerId.toString(),
        name: business.name,
        currency: business.currency,
        businessType: business.businessType,
        contactEmail: business.contactEmail,
        contactPhone: business.contactPhone,
        address: business.address,
        createdAt: business.createdAt,
        updatedAt: business.updatedAt,
      },
      membership: {
        role: membership.role,
        permissions: membership.permissions,
      },
    });
  } catch (error: unknown) {
    return apiError(error);
  }
}