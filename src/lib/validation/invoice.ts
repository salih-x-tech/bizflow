import "server-only";
import { z } from "zod";

const objectIdSchema = z
  .string()
  .regex(/^[a-fA-F0-9]{24}$/, "Enter a valid order ID.")
  .transform((value) => value.toLowerCase());

export const listInvoicesQuerySchema = z.strictObject({
  orderId: objectIdSchema.optional(),

  invoiceNumber: z
    .string()
    .trim()
    .max(100, "Invoice number must not exceed 100 characters.")
    .transform((value) => value || undefined)
    .optional(),

  status: z
    .enum(["Issued", "Voided", "All"])
    .default("All"),

  page: z.coerce.number().int().min(1).max(10_000).default(1),

  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListInvoicesQuery = z.infer<
  typeof listInvoicesQuerySchema
>;