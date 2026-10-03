import "server-only";
import { z } from "zod";

const optionalEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, "Email must not exceed 254 characters.")
  .pipe(
    z.union([
      z.literal(""),
      z.email({ error: "Enter a valid customer email address." }),
    ]),
  )
  .transform((value) => value || undefined)
  .optional();

function optionalTextSchema(maxLength: number) {
  return z
    .string()
    .trim()
    .max(maxLength, `Must not exceed ${maxLength} characters.`)
    .transform((value) => value || undefined)
    .optional();
}

export const createCustomerSchema = z.strictObject({
  name: z
    .string()
    .trim()
    .min(1, "Customer name is required.")
    .max(100, "Customer name must not exceed 100 characters."),

  email: optionalEmailSchema,
  phone: optionalTextSchema(30),
  address: optionalTextSchema(500),
  notes: optionalTextSchema(2000),
});

export const updateCustomerSchema = createCustomerSchema
  .partial()
  .extend({
    status: z.enum(["Active", "Archived"]).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    error: "Provide at least one customer field to update.",
  });

export type CreateCustomerInput = z.infer<
  typeof createCustomerSchema
>;

export type UpdateCustomerInput = z.infer<
  typeof updateCustomerSchema
>;

export const listCustomersQuerySchema = z.strictObject({
  search: z
    .string()
    .trim()
    .max(100, "Search must not exceed 100 characters.")
    .default(""),

  name: optionalTextSchema(100),

  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(254, "Email filter must not exceed 254 characters.")
    .transform((value) => value || undefined)
    .optional(),

  phone: optionalTextSchema(30),

  status: z
    .enum(["Active", "Archived", "All"])
    .default("Active"),

  page: z.coerce.number().int().min(1).max(10_000).default(1),

  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListCustomersQuery = z.infer<
  typeof listCustomersQuerySchema
>;