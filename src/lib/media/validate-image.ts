import "server-only";
import sharp from "sharp";
import { AppError } from "@/lib/errors";

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const ALLOWED_TYPES = new Map([
  ["jpeg", "image/jpeg"],
  ["png", "image/png"],
  ["webp", "image/webp"],
]);

function detectImageFormat(buffer: Buffer) {
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return "jpeg";
  }

  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    )
  ) {
    return "png";
  }

  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "webp";
  }

  return undefined;
}

export async function validateImage(file: File) {
  if (file.size === 0) {
    throw new AppError(
      "EMPTY_IMAGE",
      "Select a nonempty image.",
      400,
    );
  }

  if (file.size > MAX_IMAGE_BYTES) {
    throw new AppError(
      "IMAGE_TOO_LARGE",
      "Images must not exceed 5 MB.",
      413,
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const format = detectImageFormat(buffer);

  if (
    !format ||
    ALLOWED_TYPES.get(format) !== file.type.toLowerCase()
  ) {
    throw new AppError(
      "UNSUPPORTED_IMAGE_TYPE",
      "Upload a JPEG, PNG, or WebP image with a matching file type.",
      400,
    );
  }

  try {
    const image = sharp(buffer, {
      failOn: "warning",
      limitInputPixels: 20_000_000,
    });

    const metadata = await image.metadata();

    if (
      metadata.format !== format ||
      !metadata.width ||
      !metadata.height ||
      metadata.width > 6000 ||
      metadata.height > 6000 ||
      (metadata.pages ?? 1) !== 1
    ) {
      throw new AppError(
        "INVALID_IMAGE",
        "Use a static image no larger than 6000 pixels per side and 20 megapixels.",
        400,
      );
    }

    const { data, info } = await image
      .autoOrient()
      .resize({
        width: 2048,
        height: 2048,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 85 })
      .toBuffer({ resolveWithObject: true });

    if (data.length > MAX_IMAGE_BYTES) {
      throw new AppError(
        "IMAGE_TOO_LARGE",
        "The processed image exceeds 5 MB.",
        413,
      );
    }

    return {
      buffer: data,
      mimeType: "image/webp" as const,
      width: info.width,
      height: info.height,
      size: data.length,
    };
  } catch (error: unknown) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(
      "INVALID_IMAGE",
      "The image is damaged or cannot be processed.",
      400,
    );
  }
}