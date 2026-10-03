import "server-only";
import { z } from "zod";

export const createCategorySchema = z.strictObject({
  name: z
    .string()
    .trim()
    .min(1, "Category name is required.")
    .max(100, "Category name must not exceed 100 characters."),

  description: z
    .string()
    .trim()
    .max(1000, "Description must not exceed 1000 characters.")
    .transform((value) => value || undefined)
    .optional(),
});

export const updateCategorySchema = createCategorySchema
  .partial()
  .extend({
    status: z.enum(["Active", "Archived"]).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    error: "Provide at least one category field to update.",
  });

export const listCategoriesQuerySchema = z.strictObject({
  search: z
    .string()
    .trim()
    .max(100, "Search must not exceed 100 characters.")
    .default(""),

  status: z
    .enum(["Active", "Archived", "All"])
    .default("Active"),

  page: z.coerce.number().int().min(1).max(10_000).default(1),

  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateCategoryInput = z.infer<
  typeof createCategorySchema
>;

export type UpdateCategoryInput = z.infer<
  typeof updateCategorySchema
>;

export type ListCategoriesQuery = z.infer<
  typeof listCategoriesQuerySchema
>;