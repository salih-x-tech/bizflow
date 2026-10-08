import { apiError, apiSuccess } from "@/lib/api/response";
import { requireUser } from "@/lib/auth/require-user";
import { getMedia } from "@/services/media/get-media.service";

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