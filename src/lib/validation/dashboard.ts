import "server-only";
import { z } from "zod";

export const dashboardQuerySchema = z.strictObject({
  recentOrdersLimit: z.coerce
    .number()
    .int()
    .min(1)
    .max(20)
    .default(5),

  lowStockLimit: z.coerce
    .number()
    .int()
    .min(1)
    .max(20)
    .default(5),
});

export type DashboardQuery = z.infer<
  typeof dashboardQuerySchema
>;