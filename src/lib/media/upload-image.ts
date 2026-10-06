import "server-only";
import type { UploadApiResponse } from "cloudinary";
import { AppError } from "@/lib/errors";
import { getCloudinary } from "@/lib/media/cloudinary";
import { MAX_IMAGE_BYTES } from "@/lib/media/validate-image";

export function buildMediaPublicId(
  businessId: string,
  mediaId: string,
) {
  const objectIdPattern = /^[a-f0-9]{24}$/;

  if (
    !objectIdPattern.test(businessId) ||
    !objectIdPattern.test(mediaId)
  ) {
    throw new AppError(
      "INVALID_MEDIA_IDENTIFIER",
      "Invalid media storage identifier.",
      400,
    );
  }

  return `bizflow/${businessId}/${mediaId}`;
}

export async function uploadImage(
  businessId: string,
  mediaId: string,
  validatedBuffer: Buffer,
) {
  const publicId = buildMediaPublicId(
    businessId,
    mediaId,
  );

  if (
    validatedBuffer.length === 0 ||
    validatedBuffer.length > MAX_IMAGE_BYTES
  ) {
    throw new AppError(
      "INVALID_IMAGE_SIZE",
      "The processed image must be between 1 byte and 5 MB.",
      400,
    );
  }

  const cloudinary = getCloudinary();

  try {
    const result = await new Promise<UploadApiResponse>(
      (resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            public_id: publicId,
            resource_type: "image",
            type: "upload",
            overwrite: false,
            timeout: 60_000,
          },
          (error, uploadResult) => {
            if (error) {
              reject(error);
              return;
            }

            if (!uploadResult) {
              reject(new Error("Missing upload response."));
              return;
            }

            resolve(uploadResult);
          },
        );

        stream.on("error", reject);
        stream.end(validatedBuffer);
      },
    );

    if (
      result.public_id !== publicId ||
      result.resource_type !== "image" ||
      result.format !== "webp" ||
      new URL(result.secure_url).protocol !== "https:"
    ) {
      throw new Error("Unexpected upload response.");
    }

    return {
      publicId,
      url: result.secure_url,
      mimeType: "image/webp" as const,
    };
    } catch (error: unknown) {
    console.error(
      "Cloudinary upload failed:",
      error instanceof Error
        ? error.message
        : typeof error === "object" &&
            error !== null &&
            "message" in error
          ? String(error.message)
          : "Unknown upload error",
    );

    throw new AppError(
      "MEDIA_UPLOAD_FAILED",
      "The image could not be uploaded. Please try again.",
      502,
    );
  }
}