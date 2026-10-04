import "server-only";
import { z } from "zod";

const objectIdSchema = z
  .string()
  .regex(/^[a-fA-F0-9]{24}$/, "Enter a valid product ID.")
  .transform((value) => value.toLowerCase());

const nonnegativeIntegerSchema = z
  .number()
  .int()
  .min(0)
  .max(Number.MAX_SAFE_INTEGER);

const paginationFields = {
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
};

export const listInventoryQuerySchema = z.strictObject({
  search: z.string().trim().max(150).default(""),

  productId: objectIdSchema.optional(),

  status: z.enum(["Active", "Archived", "All"]).default("Active"),

  lowStock: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),

  ...paginationFields,
});

export const updateInventorySchema = z
  .strictObject({
    type: z
      .enum(["MANUAL_INCREASE", "MANUAL_DECREASE"])
      .optional(),

    quantity: z
      .number()
      .int()
      .min(1, "Adjustment quantity must be at least 1.")
      .max(Number.MAX_SAFE_INTEGER)
      .optional(),

    reason: z
      .string()
      .trim()
      .max(500)
      .transform((value) => value || undefined)
      .optional(),

    lowStockThreshold: nonnegativeIntegerSchema
      .nullable()
      .optional(),
  })
  .superRefine((data, context) => {
    const hasType = data.type !== undefined;
    const hasQuantity = data.quantity !== undefined;
    const hasThreshold = data.lowStockThreshold !== undefined;

    if (hasType !== hasQuantity) {
      context.addIssue({
        code: "custom",
        path: hasType ? ["quantity"] : ["type"],
        message: "Provide both adjustment type and quantity.",
      });
    }

    if (!hasType && !hasQuantity && !hasThreshold) {
      context.addIssue({
        code: "custom",
        message: "Provide a stock adjustment or low-stock threshold.",
      });
    }

    if (data.reason !== undefined && !hasType) {
      context.addIssue({
        code: "custom",
        path: ["reason"],
        message: "A reason must accompany a stock adjustment.",
      });
    }
  });

export const listInventoryAdjustmentsQuerySchema = z.strictObject({
  productId: objectIdSchema.optional(),

  type: z
    .enum([
      "INITIAL_STOCK",
      "MANUAL_INCREASE",
      "MANUAL_DECREASE",
      "ORDER_DEDUCTION",
      "ORDER_REVERSAL",
    ])
    .optional(),

  ...paginationFields,
});

export type ListInventoryQuery = z.infer<
  typeof listInventoryQuerySchema
>;

export type UpdateInventoryInput = z.infer<
  typeof updateInventorySchema
>;

export type ListInventoryAdjustmentsQuery = z.infer<
  typeof listInventoryAdjustmentsQuerySchema
>;