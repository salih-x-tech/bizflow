import "server-only";

export interface ErrorDetail {
  field: string;
  issue: string;
}

export class AppError extends Error {
  readonly code: string;
  readonly statusCode: number;
  readonly details: ErrorDetail[];

  constructor(
    code: string,
    message: string,
    statusCode: number,
    details: ErrorDetail[] = [],
  ) {
    super(message);

    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}