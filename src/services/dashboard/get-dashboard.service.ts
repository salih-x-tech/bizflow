import "server-only";
import Decimal from "decimal.js";
import type { Types } from "mongoose";
import { AppError } from "@/lib/errors";
import { dashboardQuerySchema } from "@/lib/validation/dashboard";
import { Order } from "@/models/Order";
import { requireDashboardAccess } from "@/services/dashboard/dashboard-access.service";
import { listInventory } from "@/services/inventory/list-inventory.service";

interface RevenueResult {
  completedOrders: number;
  totalRevenue: string;
}

async function getRevenueOverview(
  businessId: Types.ObjectId,
  currency: string,
) {
  const [result] = await Order.aggregate<RevenueResult>([
    {
      $match: {
        businessId,
        status: "Completed",
      },
    },
    {
      $group: {
        _id: null,
        completedOrders: { $sum: 1 },
        totalRevenue: {
          $sum: {
            $toDecimal: {
              $toString: "$totalAmount",
            },
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        completedOrders: 1,
        totalRevenue: { $toString: "$totalRevenue" },
      },
    },
  ]);

  const decimalTotal = new Decimal(result?.totalRevenue ?? "0");
  const totalRevenue = decimalTotal.toNumber();

  if (
    !decimalTotal.isFinite() ||
    decimalTotal.lt(0) ||
    decimalTotal.gt(Number.MAX_SAFE_INTEGER) ||
    !new Decimal(totalRevenue.toString()).eq(decimalTotal)
  ) {
    throw new AppError(
      "REVENUE_AMOUNT_OUT_OF_RANGE",
      "The revenue total cannot be represented within the supported range.",
      400,
    );
  }

  return {
    totalRevenue,
    completedOrders: result?.completedOrders ?? 0,
    currency,
  };
}

async function getRecentOrders(
  businessId: Types.ObjectId,
  limit: number,
) {
  const records = await Order.find({
    businessId,
  })
    .select("_id customerId totalAmount status createdAt")
    .sort({
      createdAt: -1,
      _id: -1,
    })
    .limit(limit)
    .lean();

  return {
    orders: records.map((order) => ({
      id: order._id.toString(),
      customerId: order.customerId.toString(),
      totalAmount: order.totalAmount,
      status: order.status,
      createdAt: order.createdAt,
    })),
    limit,
  };
}

export async function getDashboard(
  authenticatedUserId: string,
  businessId: string,
  input: unknown,
) {
  const {
    business,
    canViewRecentOrders,
    canViewRevenue,
    canViewLowStock,
  } = await requireDashboardAccess(
    authenticatedUserId,
    businessId,
  );

  const query = dashboardQuerySchema.parse(input);

  const [revenue, recentOrders, lowStockResult] = await Promise.all([
    canViewRevenue
      ? getRevenueOverview(business._id, business.currency)
      : Promise.resolve(null),

    canViewRecentOrders
      ? getRecentOrders(business._id, query.recentOrdersLimit)
      : Promise.resolve(null),

    canViewLowStock
      ? listInventory(
          authenticatedUserId,
          businessId,
          {
            status: "Active",
            lowStock: "true",
            page: 1,
            limit: query.lowStockLimit,
          },
        )
      : Promise.resolve(null),
  ]);

  return {
    business: {
      id: business._id.toString(),
      name: business.name,
      currency: business.currency,
    },

    widgetAccess: {
      revenue: canViewRevenue,
      recentOrders: canViewRecentOrders,
      lowStock: canViewLowStock,
    },

    ...(revenue !== null
      ? { revenue }
      : {}),

    ...(recentOrders !== null
      ? { recentOrders }
      : {}),

    ...(lowStockResult !== null
      ? {
          lowStock: {
            products: lowStockResult.inventory,
            total: lowStockResult.pagination.total,
            limit: query.lowStockLimit,
          },
        }
      : {}),
  };
}