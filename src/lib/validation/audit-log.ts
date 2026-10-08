import "server-only";
import { z } from "zod";

function optionalFilter(maxLength: number) {
  return z
    .string()
    .trim()
    .min(1, "Filter must not be empty.")
    .max(maxLength)
    .optional();
}

const dateFilterSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.")
  .refine(
    (value) => {
      const date = new Date(`${value}T00:00:00.000Z`);

      return (
        Number.isFinite(date.getTime()) &&
        date.toISOString().slice(0, 10) === value
      );
    },
    {
      error: "Enter a valid calendar date.",
    },
  );

export const listAuditLogsQuerySchema = z
  .strictObject({
    action: optionalFilter(100),

    entityType: optionalFilter(100),

    entityId: z
      .string()
      .regex(
        /^[a-fA-F0-9]{24}$/,
        "Enter a valid entity ID.",
      )
      .optional(),

    from: dateFilterSchema.optional(),

    to: dateFilterSchema.optional(),

    page: z.coerce
      .number()
      .int()
      .min(1)
      .max(10_000)
      .default(1),

    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(100)
      .default(20),
  })
  .refine(
    (data) =>
      !data.from ||
      !data.to ||
      data.from <= data.to,
    {
      error: "From date must not be after to date.",
      path: ["to"],
    },
  );

export type ListAuditLogsQuery = z.infer<
  typeof listAuditLogsQuerySchema
>;