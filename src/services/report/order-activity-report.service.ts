import "server-only";
import type { Types } from "mongoose";
import { AppError } from "@/lib/errors";
import { reportQuerySchema } from "@/lib/validation/report";
import { Order } from "@/models/Order";
import { requireBusinessAccess } from "@/services/business/business-access.service";

interface OrderActivityResult {
  summary: {
    totalOrders: number;
    pendingOrders: number;
    completedOrders: number;
    cancelledOrders: number;
  }[];

  orders: {
    _id: Types.ObjectId;
    customerId: Types.ObjectId;
    createdBy: Types.ObjectId;
    totalAmount: number;
    status: "Pending" | "Completed" | "Cancelled";
    createdAt: Date;
    updatedAt: Date;
  }[];
}

export async function getOrderActivityReport(
  authenticatedUserId: string,
  businessId: string,
  input: unknown,
) {
  const { business } = await requireBusinessAccess(
    authenticatedUserId,
    businessId,
    "canViewReports",
  );

  const query = reportQuerySchema.parse(input);

  if (query.type !== "orders") {
    throw new AppError(
      "INVALID_REPORT_TYPE",
      "This service only supports order activity reports.",
      400,
    );
  }

  const [result] = await Order.aggregate<OrderActivityResult>([
    {
      $match: {
        businessId: business._id,
        createdAt: {
          $gte: query.rangeStart,
          $lt: query.rangeEndExclusive,
        },
      },
    },
    {
      $facet: {
        summary: [
          {
            $group: {
              _id: null,
              totalOrders: { $sum: 1 },
              pendingOrders: {
                $sum: {
                  $cond: [
                    { $eq: ["$status", "Pending"] },
                    1,
                    0,
                  ],
                },
              },
              completedOrders: {
                $sum: {
                  $cond: [
                    { $eq: ["$status", "Completed"] },
                    1,
                    0,
                  ],
                },
              },
              cancelledOrders: {
                $sum: {
                  $cond: [
                    { $eq: ["$status", "Cancelled"] },
                    1,
                    0,
                  ],
                },
              },
            },
          },
          { $project: { _id: 0 } },
        ],
        orders: [
          { $sort: { createdAt: -1, _id: -1 } },
          { $skip: (query.page - 1) * query.limit },
          { $limit: query.limit },
          {
            $project: {
              _id: 1,
              customerId: 1,
              createdBy: 1,
              totalAmount: 1,
              status: 1,
              createdAt: 1,
              updatedAt: 1,
            },
          },
        ],
      },
    },
  ]);

  const summary = result?.summary[0] ?? {
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    cancelledOrders: 0,
  };

  return {
    type: "orders" as const,
    businessId: business._id.toString(),
    dateRange: {
      from: query.from,
      to: query.to,
      timezone: "UTC",
    },
    dateBasis: "createdAt" as const,
    statusBasis: "current" as const,
    summary,
    orders: (result?.orders ?? []).map((order) => ({
      id: order._id.toString(),
      customerId: order.customerId.toString(),
      createdBy: order.createdBy.toString(),
      totalAmount: order.totalAmount,
      status: order.status,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    })),
    pagination: {
      page: query.page,
      limit: query.limit,
      total: summary.totalOrders,
      totalPages: Math.ceil(
        summary.totalOrders / query.limit,
      ),
    },
  };
}