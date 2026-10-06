import { assertTrustedOrigin } from "@/lib/api/origin";
import { apiError, apiSuccess } from "@/lib/api/response";
import { consumeRateLimit } from "@/lib/auth/rate-limit";
import { requireUser } from "@/lib/auth/require-user";
import { readImageUpload } from "@/lib/media/read-image-upload";
import { requireBusinessAccess } from "@/services/business/business-access.service";
import { uploadMedia } from "@/services/media/upload-media.service";

export const runtime = "nodejs";

type MediaRouteContext = {
  params: Promise<{ businessId: string }>;
};

export async function POST(
  request: Request,
  context: MediaRouteContext,
) {
  try {
    assertTrustedOrigin(request);

    const user = await requireUser();
    const { businessId } = await context.params;

    await requireBusinessAccess(
      user.id,
      businessId,
      "canManageProducts",
    );

    await consumeRateLimit({
      scope: "media:upload:user",
      identifier: user.id,
      limit: 10,
      windowMs: 60 * 1000,
    });

    const file = await readImageUpload(request);

    const media = await uploadMedia(
      user.id,
      businessId,
      file,
    );

    return apiSuccess({ media }, 201);
  } catch (error: unknown) {
    return apiError(error);
  }
}