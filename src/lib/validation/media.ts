import "server-only";
import { z } from "zod";

export const listMediaQuerySchema = z.strictObject({
  includeDeleting: z.enum(["true", "false"]).default("false").transform((value) => value === "true"),
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
});

export type ListMediaQuery = z.infer<
  typeof listMediaQuerySchema
>;
