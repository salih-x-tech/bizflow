import "server-only";
import { AppError } from "@/lib/errors";
import { MAX_IMAGE_BYTES } from "@/lib/media/validate-image";

const MAX_UPLOAD_REQUEST_BYTES =
  MAX_IMAGE_BYTES + 64 * 1024;

export async function readImageUpload(
  request: Request,
): Promise<File> {
  const contentType =
    request.headers.get("content-type") ?? "";

  if (
    !/^multipart\/form-data(?:\s*;|$)/i.test(contentType)
  ) {
    throw new AppError(
      "INVALID_UPLOAD_CONTENT_TYPE",
      "Send the image using multipart/form-data.",
      415,
    );
  }

  const contentLength =
    request.headers.get("content-length");

  if (contentLength !== null) {
    if (
      !/^\d+$/.test(contentLength) ||
      !Number.isSafeInteger(Number(contentLength))
    ) {
      throw new AppError(
        "INVALID_CONTENT_LENGTH",
        "Invalid upload request length.",
        400,
      );
    }

    if (
      Number(contentLength) > MAX_UPLOAD_REQUEST_BYTES
    ) {
      throw new AppError(
        "UPLOAD_REQUEST_TOO_LARGE",
        "The upload request exceeds the allowed size.",
        413,
      );
    }
  }

  if (!request.body) {
    throw new AppError(
      "MISSING_UPLOAD_BODY",
      "An image upload is required.",
      400,
    );
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      totalBytes += value.byteLength;

      if (totalBytes > MAX_UPLOAD_REQUEST_BYTES) {
        await reader.cancel().catch(() => undefined);

        throw new AppError(
          "UPLOAD_REQUEST_TOO_LARGE",
          "The upload request exceeds the allowed size.",
          413,
        );
      }

      chunks.push(value);
    }
  } catch (error: unknown) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(
      "UPLOAD_READ_FAILED",
      "The upload request could not be read.",
      400,
    );
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;

  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  let formData: FormData;

  try {
    formData = await new Response(body, {
      headers: {
        "content-type": contentType,
      },
    }).formData();
  } catch {
    throw new AppError(
      "INVALID_MULTIPART_BODY",
      "The multipart upload is malformed.",
      400,
    );
  }

  const entries = Array.from(formData.entries());

  if (
    entries.length !== 1 ||
    entries[0][0] !== "file" ||
    !(entries[0][1] instanceof File)
  ) {
    throw new AppError(
      "INVALID_UPLOAD_FIELDS",
      "Provide exactly one image in the file field.",
      400,
    );
  }

  return entries[0][1];
}