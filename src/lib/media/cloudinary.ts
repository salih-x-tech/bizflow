import "server-only";
import { v2 as cloudinary } from "cloudinary";
import { AppError } from "@/lib/errors";

export function getCloudinary() {
  const cloudName =
    process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey =
    process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret =
    process.env.CLOUDINARY_API_SECRET?.trim();

  if (!cloudName || !apiKey || !apiSecret) {
    throw new AppError(
      "MEDIA_STORAGE_NOT_CONFIGURED",
      "Media storage is not configured.",
      503,
    );
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });

  return cloudinary;
}