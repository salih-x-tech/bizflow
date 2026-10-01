import "server-only";
import { createHash } from "node:crypto";
import { connectDB } from "@/lib/db/connect";
import { AppError } from "@/lib/errors";
import { RateLimit } from "@/models/RateLimit";

interface RateLimitOptions {
  scope: string;
  identifier: string;
  limit: number;
  windowMs: number;
}

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 11000
  );
}

export async function consumeRateLimit({
  scope,
  identifier,
  limit,
  windowMs,
}: RateLimitOptions): Promise<void> {
  if (
    !Number.isSafeInteger(limit) ||
    limit < 1 ||
    !Number.isSafeInteger(windowMs) ||
    windowMs < 1
  ) {
    throw new Error("Invalid rate-limit configuration.");
  }

  await connectDB();
  await RateLimit.init();

  const windowNumber = Math.floor(Date.now() / windowMs);
  const expiresAt = new Date((windowNumber + 1) * windowMs);

  const key = createHash("sha256")
    .update(JSON.stringify([scope, identifier, windowMs, windowNumber]))
    .digest("hex");

  const update = {
    $inc: { count: 1 },
    $setOnInsert: { expiresAt },
  };

  const counter = await RateLimit.findOneAndUpdate(
    { key },
    update,
    {
      upsert: true,
      returnDocument: "after",
      runValidators: true,
    },
  ).catch(async (error: unknown) => {
    if (!isDuplicateKeyError(error)) {
      throw error;
    }

    return RateLimit.findOneAndUpdate(
      { key },
      { $inc: { count: 1 } },
      { returnDocument: "after", runValidators: true },
    );
  });

  if (!counter) {
    throw new Error("Rate-limit counter could not be updated.");
  }

  if (counter.count > limit) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((expiresAt.getTime() - Date.now()) / 1000),
    );

    throw new AppError(
      "RATE_LIMIT_EXCEEDED",
      "Too many requests. Please try again later.",
      429,
      [
        {
          field: "request",
          issue: `Try again in ${retryAfterSeconds} seconds.`,
        },
      ],
    );
  }
}