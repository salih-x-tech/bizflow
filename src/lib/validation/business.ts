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
      z.email({ error: "Enter a valid contact email address." }),
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

export const createBusinessSchema = z.strictObject({
  name: z
    .string()
    .trim()
    .min(2, "Business name must contain at least 2 characters.")
    .max(100, "Business name must not exceed 100 characters."),

  currency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, "Enter a three-letter currency code."),

  businessType: z
    .string()
    .trim()
    .min(2, "Business type must contain at least 2 characters.")
    .max(100, "Business type must not exceed 100 characters."),

  contactEmail: optionalEmailSchema,
  contactPhone: optionalTextSchema(30),
  address: optionalTextSchema(500),
});

export type CreateBusinessInput = z.infer<
  typeof createBusinessSchema
>;

export const updateBusinessSchema = createBusinessSchema
  .omit({
    currency: true,
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    error: "Provide at least one business field to update.",
  });

export type UpdateBusinessInput = z.infer<
  typeof updateBusinessSchema
>;