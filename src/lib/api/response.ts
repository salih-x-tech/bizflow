import "server-only";
import { ZodError } from "zod";
import { AppError } from "@/lib/errors";

const responseHeaders = {
  "Cache-Control": "no-store",
};

export function apiSuccess<T>(data: T, status = 200) {
  return Response.json(
    {
      success: true,
      data,
    },
    {
      status,
      headers: responseHeaders,
    },
  );
}

export function apiError(error: unknown) {
  if (error instanceof AppError) {
    return Response.json(
      {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      },
      {
        status: error.statusCode,
        headers: responseHeaders,
      },
    );
  }

  if (error instanceof ZodError) {
    return apiError(
      new AppError(
        "VALIDATION_ERROR",
        "Please check the submitted information.",
        400,
        error.issues.map((issue) => ({
          field: issue.path.map(String).join(".") || "body",
          issue: issue.message,
        })),
      ),
    );
  }

  return apiError(
    new AppError(
      "INTERNAL_ERROR",
      "Something went wrong. Please try again.",
      500,
    ),
  );
}