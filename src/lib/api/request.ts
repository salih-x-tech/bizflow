import "server-only";
import { AppError } from "@/lib/errors";

const MAX_BODY_BYTES = 16 * 1024;

export async function readJsonBody(request: Request): Promise<unknown> {
  const contentType = request.headers
    .get("content-type")
    ?.split(";")[0]
    .trim()
    .toLowerCase();

  if (contentType !== "application/json") {
    throw new AppError(
      "UNSUPPORTED_MEDIA_TYPE",
      "Send the request body as application/json.",
      415,
    );
  }

  if (!request.body) {
    throw new AppError("INVALID_JSON", "A JSON request body is required.", 400);
  }

  const reader = request.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });

  let byteCount = 0;
  let text = "";

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      byteCount += value.byteLength;

      if (byteCount > MAX_BODY_BYTES) {
        await reader.cancel();

        throw new AppError(
          "PAYLOAD_TOO_LARGE",
          "Request body must not exceed 16 KB.",
          413,
        );
      }

      text += decoder.decode(value, { stream: true });
    }

    text += decoder.decode();

    return JSON.parse(text) as unknown;
  } catch (error: unknown) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(
      "INVALID_JSON",
      "Request body must contain valid UTF-8 JSON.",
      400,
    );
  } finally {
    reader.releaseLock();
  }
}