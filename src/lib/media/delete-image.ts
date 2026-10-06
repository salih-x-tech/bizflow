import "server-only";
import { AppError } from "@/lib/errors";
import { getCloudinary } from "@/lib/media/cloudinary";
import { buildMediaPublicId } from "@/lib/media/upload-image";

export async function deleteImage(
  businessId: string,
  mediaId: string,
  storedPublicId: string,
) {
  const expectedPublicId = buildMediaPublicId(
    businessId,
    mediaId,
  );

  if (storedPublicId !== expectedPublicId) {
    throw new AppError(
      "MEDIA_STORAGE_ID_MISMATCH",
      "The media storage identifier does not match this record.",
      409,
    );
  }

  const cloudinary = getCloudinary();

  try {
    const response: unknown =
      await cloudinary.uploader.destroy(
        expectedPublicId,
        {
          resource_type: "image",
          type: "upload",
          invalidate: true,
        },
      );

    if (
      typeof response !== "object" ||
      response === null ||
      !("result" in response) ||
      (
        response.result !== "ok" &&
        response.result !== "not found"
      )
    ) {
      throw new Error("Unexpected deletion response.");
    }

    return {
      publicId: expectedPublicId,
      alreadyAbsent: response.result === "not found",
    };
  } catch {
    throw new AppError(
      "MEDIA_DELETE_FAILED",
      "The image could not be deleted. Please try again.",
      502,
    );
  }
}