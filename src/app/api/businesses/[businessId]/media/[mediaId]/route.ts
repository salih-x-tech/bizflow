import { apiError, apiSuccess } from "@/lib/api/response";
import { requireUser } from "@/lib/auth/require-user";
import { getMedia } from "@/services/media/get-media.service";
import { assertTrustedOrigin } from "@/lib/api/origin";
import { consumeRateLimit } from "@/lib/auth/rate-limit";
import { deleteMedia } from "@/services/media/delete-media.service";


export const runtime = "nodejs";

type MediaDetailRouteContext = {
  params: Promise<{
    businessId: string;
    mediaId: string;
  }>;
};

export async function GET(
  _request: Request,
  context: MediaDetailRouteContext,
) {
  try {
    const user = await requireUser();
    const { businessId, mediaId } = await context.params;

    const media = await getMedia(
      user.id,
      businessId,
      mediaId,
    );

    return apiSuccess({ media });
  } catch (error: unknown) {
    return apiError(error);
  }
}

export async function DELETE(
  request: Request,
  context: MediaDetailRouteContext,
) {
  try {
    assertTrustedOrigin(request);

    const user = await requireUser();
    const { businessId, mediaId } = await context.params;

    await consumeRateLimit({
      scope: "media:delete:user",
      identifier: user.id,
      limit: 30,
      windowMs: 60 * 1000,
    });

    const media = await deleteMedia(
      user.id,
      businessId,
      mediaId,
    );

    return apiSuccess({ media });
  } catch (error: unknown) {
    return apiError(error);
  }
}