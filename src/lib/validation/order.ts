import "server-only";
import { z } from "zod";

const objectIdSchema = z
  .string()
  .regex(/^[a-fA-F0-9]{24}$/, "Enter a valid record ID.")
  .transform((value) => value.toLowerCase());

const orderItemSchema = z.strictObject({
  productId: objectIdSchema,

  quantity: z
    .number()
    .int()
    .min(1, "Quantity must be at least 1.")
    .max(Number.MAX_SAFE_INTEGER),
});

const orderItemsSchema = z
  .array(orderItemSchema)
  .min(1, "An order must contain at least one item.")
  .max(100, "An order must not exceed 100 items.")
  .refine(
    (items) =>
      new Set(items.map((item) => item.productId)).size ===
      items.length,
    {
      error: "Each product may appear only once in an order.",
    },
  );

export const createOrderSchema = z.strictObject({
  customerId: objectIdSchema,
  items: orderItemsSchema,
});

export const updateOrderSchema = createOrderSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    error: "Provide a customer or order items to update.",
  });

export const updateOrderStatusSchema = z.strictObject({
  status: z.enum(["Completed", "Cancelled"]),
});

export const listOrdersQuerySchema = z.strictObject({
  customerId: objectIdSchema.optional(),

  status: z
    .enum(["Pending", "Completed", "Cancelled", "All"])
    .default("All"),

  page: z.coerce.number().int().min(1).max(10_000).default(1),

  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateOrderInput = z.infer<
  typeof createOrderSchema
>;

export type UpdateOrderInput = z.infer<
  typeof updateOrderSchema
>;

export type UpdateOrderStatusInput = z.infer<
  typeof updateOrderStatusSchema
>;

export type ListOrdersQuery = z.infer<
  typeof listOrdersQuerySchema
>;