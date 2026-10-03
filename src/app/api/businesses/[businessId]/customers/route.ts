import { assertTrustedOrigin } from "@/lib/api/origin";
import { readJsonBody } from "@/lib/api/request";
import { apiError, apiSuccess } from "@/lib/api/response";
import { consumeRateLimit } from "@/lib/auth/rate-limit";
import { requireUser } from "@/lib/auth/require-user";
import { createCustomer } from "@/services/customer/create-customer.service";
import { listCustomers } from "@/services/customer/list-customers.service";


export const runtime = "nodejs";

type CustomerRouteContext = {
  params: Promise<{ businessId: string }>;
};

export async function GET(
  request: Request,
  context: CustomerRouteContext,
) {
  try {
    const user = await requireUser();
    const { businessId } = await context.params;

    const query = Object.fromEntries(
      new URL(request.url).searchParams.entries(),
    );

    const result = await listCustomers(
      user.id,
      businessId,
      query,
    );

    return apiSuccess(result);
  } catch (error: unknown) {
    return apiError(error);
  }
}

export async function POST(
  request: Request,
  context: CustomerRouteContext,
) {
  try {
    assertTrustedOrigin(request);

    const user = await requireUser();
    const { businessId } = await context.params;

    await consumeRateLimit({
      scope: "customer:create:user",
      identifier: user.id,
      limit: 60,
      windowMs: 60 * 1000,
    });

    const input = await readJsonBody(request);

    const customer = await createCustomer(
      user.id,
      businessId,
      input,
    );

    return apiSuccess(
      {
        customer,
      },
      201,
    );
  } catch (error: unknown) {
    return apiError(error);
  }
}