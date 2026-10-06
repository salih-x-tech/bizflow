import "server-only";
import Decimal from "decimal.js";
import { AppError } from "@/lib/errors";
import type { Types } from "mongoose";
import { reportQuerySchema } from "@/lib/validation/report";
import { Inventory } from "@/models/Inventory";
import { InventoryAdjustment } from "@/models/InventoryAdjustment";
import { Product } from "@/models/Product";
import { requireBusinessAccess } from "@/services/business/business-access.service";


interface StockMovement {
  type: string;
  quantityChange: string;
}

function safeQuantity(value: Decimal): number {
  const quantity = value.toNumber();

  if (
    !value.isFinite() ||
    !value.isInteger() ||
    value.abs().gt(Number.MAX_SAFE_INTEGER) ||
    !new Decimal(quantity.toString()).eq(value)
  ) {
    throw new AppError(
      "INVENTORY_REPORT_OUT_OF_RANGE",
      "An inventory report quantity exceeds the supported range.",
      400,
    );
  }

  return quantity;
}

function calculateStockMetrics(
  openingQuantity: number,
  closingQuantity: number,
  movements: StockMovement[],
) {
  const totals = new Map(
    movements.map((movement) => [
      movement.type,
      new Decimal(movement.quantityChange),
    ]),
  );

  const getTotal = (type: string) =>
    totals.get(type) ?? new Decimal(0);

  const initialStock = getTotal("INITIAL_STOCK");
  const manualIncrease = getTotal("MANUAL_INCREASE");
  const manualDecrease = getTotal("MANUAL_DECREASE").negated();
  const orderDeductions = getTotal("ORDER_DEDUCTION").negated();
  const orderReversals = getTotal("ORDER_REVERSAL");

  const netUnitsSold = orderDeductions.minus(orderReversals);

  const netQuantityChange = movements.reduce(
    (total, movement) =>
      total.plus(movement.quantityChange),
    new Decimal(0),
  );

  const expectedClosing = new Decimal(openingQuantity)
    .plus(netQuantityChange);

  if (!expectedClosing.eq(closingQuantity)) {
    throw new AppError(
      "INVENTORY_HISTORY_INCONSISTENT",
      "Inventory history does not reconcile for this date range.",
      409,
    );
  }

  const averageStock = new Decimal(openingQuantity)
    .plus(closingQuantity)
    .dividedBy(2);

  const unitTurnover =
    averageStock.gt(0) && netUnitsSold.gte(0)
      ? netUnitsSold
          .dividedBy(averageStock)
          .toDecimalPlaces(4)
          .toNumber()
      : null;

  return {
    initialStock: safeQuantity(initialStock),
    manualIncrease: safeQuantity(manualIncrease),
    manualDecrease: safeQuantity(manualDecrease),
    orderDeductions: safeQuantity(orderDeductions),
    orderReversals: safeQuantity(orderReversals),
    netUnitsSold: safeQuantity(netUnitsSold),
    netQuantityChange: safeQuantity(netQuantityChange),
    averageStock: averageStock.toNumber(),
    unitTurnover,
  };
}

interface InventoryReportRow {
  _id: Types.ObjectId;
  productId: Types.ObjectId;
  quantity: number;
  lowStockThreshold?: number;
  product: {
    name: string;
    status: "Active" | "Archived";
  };
  history: {
    opening: { newQuantity: number }[];
    closing: { newQuantity: number }[];
    movements: StockMovement[];
  }[];
}

interface InventoryReportResult {
  total: { count: number }[];
  products: InventoryReportRow[];
}

interface InventoryHistoryResult {
  opening: {
    _id: Types.ObjectId;
    quantity: number;
  }[];
  closing: {
    _id: Types.ObjectId;
    quantity: number;
  }[];
  movements: {
    _id: {
      productId: Types.ObjectId;
      type: string;
    };
    quantityChange: string;
  }[];
}

export async function getInventoryReport(
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

  if (query.type !== "inventory") {
    throw new AppError(
      "INVALID_REPORT_TYPE",
      "This service only supports inventory reports.",
      400,
    );
  }

  const [result] =
    await Inventory.aggregate<InventoryReportResult>([
      {
        $match: {
          businessId: business._id,
          createdAt: { $lt: query.rangeEndExclusive },
        },
      },
      {
        $lookup: {
          from: Product.collection.name,
          let: {
            productId: "$productId",
            businessId: "$businessId",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$productId"] },
                    { $eq: ["$businessId", "$$businessId"] },
                  ],
                },
              },
            },
            { $project: { _id: 0, name: 1, status: 1 } },
          ],
          as: "product",
        },
      },
      { $unwind: "$product" },
      {
        $facet: {
          total: [{ $count: "count" }],
          products: [
            { $sort: { "product.name": 1, _id: 1 } },
            { $skip: (query.page - 1) * query.limit },
            { $limit: query.limit },
            {
              $project: {
                _id: 1,
                productId: 1,
                quantity: 1,
                lowStockThreshold: 1,
                product: 1,
              },
            },
          ],
        },
      },
    ]);

  const records = result?.products ?? [];
  const total = result?.total[0]?.count ?? 0;

  const [history] =
    await InventoryAdjustment.aggregate<InventoryHistoryResult>([
      {
        $match: {
          businessId: business._id,
          productId: {
            $in: records.map((record) => record.productId),
          },
          createdAt: { $lt: query.rangeEndExclusive },
        },
      },
      {
        $facet: {
          opening: [
            {
              $match: {
                createdAt: { $lt: query.rangeStart },
              },
            },
            { $sort: { createdAt: 1, _id: 1 } },
            {
              $group: {
                _id: "$productId",
                quantity: { $last: "$newQuantity" },
              },
            },
          ],
          closing: [
            { $sort: { createdAt: 1, _id: 1 } },
            {
              $group: {
                _id: "$productId",
                quantity: { $last: "$newQuantity" },
              },
            },
          ],
          movements: [
            {
              $match: {
                createdAt: { $gte: query.rangeStart },
              },
            },
            {
              $group: {
                _id: {
                  productId: "$productId",
                  type: "$type",
                },
                quantityChange: {
                  $sum: {
                    $toDecimal: {
                      $toString: "$quantityChange",
                    },
                  },
                },
              },
            },
            {
              $project: {
                _id: 1,
                quantityChange: {
                  $toString: "$quantityChange",
                },
              },
            },
          ],
        },
      },
    ]);

  const openingByProduct = new Map(
    (history?.opening ?? []).map((entry) => [
      entry._id.toString(),
      entry.quantity,
    ]),
  );

  const closingByProduct = new Map(
    (history?.closing ?? []).map((entry) => [
      entry._id.toString(),
      entry.quantity,
    ]),
  );

  const movementsByProduct = new Map<
    string,
    StockMovement[]
  >();

  for (const entry of history?.movements ?? []) {
    const productId = entry._id.productId.toString();
    const movements =
      movementsByProduct.get(productId) ?? [];

    movements.push({
      type: entry._id.type,
      quantityChange: entry.quantityChange,
    });

    movementsByProduct.set(productId, movements);
  }

  return {
    type: "inventory" as const,
    businessId: business._id.toString(),
    dateRange: {
      from: query.from,
      to: query.to,
      timezone: "UTC",
    },
    turnoverBasis:
      "Net order deductions divided by average opening and closing stock.",
    products: records.map((record) => {
      const productId = record.productId.toString();
      const openingQuantity =
        openingByProduct.get(productId) ?? 0;
      const closingQuantity =
        closingByProduct.get(productId) ?? 0;

      return {
        inventoryId: record._id.toString(),
        productId,
        name: record.product.name,
        currentProductStatus: record.product.status,
        currentQuantity: record.quantity,
        currentLowStockThreshold:
          record.lowStockThreshold,
        openingQuantity,
        closingQuantity,
        ...calculateStockMetrics(
          openingQuantity,
          closingQuantity,
          movementsByProduct.get(productId) ?? [],
        ),
      };
    }),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };
}