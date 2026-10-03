import { apiError, apiSuccess } from "@/lib/api/response";
import { requireUser } from "@/lib/auth/require-user";
import { getCustomer } from "@/services/customer/get-customer.service";
import { assertTrustedOrigin } from "@/lib/api/origin";
import { readJsonBody } from "@/lib/api/request";
import { consumeRateLimit } from "@/lib/auth/rate-limit";
import { updateCustomer } from "@/services/customer/update-customer.service";


export const runtime = "nodejs";

type CustomerDetailRouteContext = {
  params: Promise<{
    businessId: string;
    customerId: string;
  }>;
};

export async function GET(
  _request: Request,
  context: CustomerDetailRouteContext,
) {
  try {
    const user = await requireUser();
    const { businessId, customerId } = await context.params;

    const customer = await getCustomer(
      user.id,
      businessId,
      customerId,
    );

    return apiSuccess({
      customer,
    });
  } catch (error: unknown) {
    return apiError(error);
  }
}

export async function PATCH(
  request: Request,
  context: CustomerDetailRouteContext,
) {
  try {
    assertTrustedOrigin(request);

    const user = await requireUser();
    const { businessId, customerId } = await context.params;

    await consumeRateLimit({
      scope: "customer:update:user",
      identifier: user.id,
      limit: 60,
      windowMs: 60 * 1000,
    });

    const input = await readJsonBody(request);

    const customer = await updateCustomer(
      user.id,
      businessId,
      customerId,
      input,
    );

    return apiSuccess({
      customer,
    });
  } catch (error: unknown) {
    return apiError(error);
  }
}

export async function DELETE(
  request: Request,
  context: CustomerDetailRouteContext,
) {
  try {
    assertTrustedOrigin(request);

    const user = await requireUser();
    const { businessId, customerId } = await context.params;

    await consumeRateLimit({
      scope: "customer:archive:user",
      identifier: user.id,
      limit: 30,
      windowMs: 60 * 1000,
    });

    const customer = await updateCustomer(
      user.id,
      businessId,
      customerId,
      {
        status: "Archived",
      },
    );

    return apiSuccess({
      customer,
    });
  } catch (error: unknown) {
    return apiError(error);
  }
}