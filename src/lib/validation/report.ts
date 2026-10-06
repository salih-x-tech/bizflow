import "server-only";
import { z } from "zod";

const reportDateSchema = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}$/,
    "Use a date in YYYY-MM-DD format.",
  )
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

export const reportQuerySchema = z
  .strictObject({
    type: z
      .enum(["sales", "inventory", "orders"])
      .default("sales"),

    from: reportDateSchema,
    to: reportDateSchema,

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
  .refine((query) => query.from <= query.to, {
    error: "The end date must be on or after the start date.",
    path: ["to"],
  })
  .transform((query) => {
    const rangeStart = new Date(
      `${query.from}T00:00:00.000Z`,
    );

    const rangeEndExclusive = new Date(
      `${query.to}T00:00:00.000Z`,
    );

    rangeEndExclusive.setUTCDate(
      rangeEndExclusive.getUTCDate() + 1,
    );

    return {
      ...query,
      rangeStart,
      rangeEndExclusive,
    };
  });

export type ReportQuery = z.infer<
  typeof reportQuerySchema
>;