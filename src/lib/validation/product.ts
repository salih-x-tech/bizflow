import "server-only";
import { z } from "zod";

const objectIdSchema = z
  .string()
  .regex(/^[a-fA-F0-9]{24}$/, "Enter a valid record ID.")
  .transform((value) => value.toLowerCase());

const mediaIdsSchema = z
  .array(objectIdSchema)
  .refine(
    (ids) => new Set(ids).size === ids.length,
    {
      error: "Duplicate media IDs are not allowed.",
    },
  );

export const createProductSchema = z.strictObject({
  name: z
    .string()
    .trim()
    .min(1, "Product name is required.")
    .max(150, "Product name must not exceed 150 characters."),

  description: z
    .string()
    .trim()
    .max(3000, "Description must not exceed 3000 characters.")
    .transform((value) => value || undefined)
    .optional(),

  categoryId: objectIdSchema,

  price: z
    .number()
    .min(0, "Price must not be negative."),

  mediaIds: mediaIdsSchema.default([]),
});

export const updateProductSchema = createProductSchema
  .omit({
    mediaIds: true,
  })
  .partial()
  .extend({
    mediaIds: mediaIdsSchema.optional(),
    status: z.enum(["Active", "Archived"]).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    error: "Provide at least one product field to update.",
  });

export type CreateProductInput = z.infer<
  typeof createProductSchema
>;

export type UpdateProductInput = z.infer<
  typeof updateProductSchema
>;

export const listProductsQuerySchema = z.strictObject({
  search: z
    .string()
    .trim()
    .max(150, "Search must not exceed 150 characters.")
    .default(""),

  categoryId: objectIdSchema.optional(),

  status: z
    .enum(["Active", "Archived", "All"])
    .default("Active"),

  page: z.coerce.number().int().min(1).max(10_000).default(1),

  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListProductsQuery = z.infer<
  typeof listProductsQuerySchema
>;