import "server-only";
import { Types, type PipelineStage } from "mongoose";
import { AppError } from "@/lib/errors";
import { listInventoryQuerySchema } from "@/lib/validation/inventory";
import { Inventory } from "@/models/Inventory";
import { Product } from "@/models/Product";
import { requireInventoryReadAccess } from "@/services/inventory/inventory-read-access.service";

interface InventoryListRow {
  _id: Types.ObjectId;
  businessId?: Types.ObjectId;
  productId: Types.ObjectId;
  quantity: number;
  lowStockThreshold?: number;
  lowStock?: boolean;
  product: {
    name: string;
    status?: "Active" | "Archived";
  };
  createdAt?: Date;
  updatedAt?: Date;
}

interface InventoryListResult {
  items: InventoryListRow[];
  total: Array<{ count: number }>;
}

export async function listInventory(
  authenticatedUserId: string,
  businessId: string,
  input: unknown,
) {
  const { business, canManageInventory } =
    await requireInventoryReadAccess(
      authenticatedUserId,
      businessId,
    );

  const query = listInventoryQuerySchema.parse(input);

  if (
    !canManageInventory &&
    (query.status !== "Active" || query.lowStock !== undefined)
  ) {
    throw new AppError(
      "FORBIDDEN",
      "Order staff may only look up active product availability.",
      403,
    );
  }

  const inventoryFilter = {
    businessId: business._id,
    ...(query.productId !== undefined
      ? { productId: new Types.ObjectId(query.productId) }
      : {}),
  };

  const productFilter: Record<string, unknown> = {};

  if (query.status !== "All") {
    productFilter["product.status"] = query.status;
  }

  if (query.search) {
    const escapedSearch = query.search.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&",
    );

    productFilter["product.name"] = {
      $regex: escapedSearch,
      $options: "i",
    };
  }

  const pipeline: PipelineStage[] = [
    {
      $match: inventoryFilter,
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
          {
            $project: {
              _id: 0,
              name: 1,
              status: 1,
            },
          },
        ],
        as: "product",
      },
    },
    {
      $unwind: "$product",
    },
    {
      $match: productFilter,
    },
    {
      $addFields: {
        lowStock: {
          $lte: [
            "$quantity",
            { $ifNull: ["$lowStockThreshold", -1] },
          ],
        },
      },
    },
  ];

  if (query.lowStock !== undefined) {
    pipeline.push({
      $match: {
        lowStock: query.lowStock,
      },
    });
  }

  pipeline.push({
    $facet: {
      items: [
        {
          $sort: {
            "product.name": 1,
            _id: 1,
          },
        },
        {
          $skip: (query.page - 1) * query.limit,
        },
        {
          $limit: query.limit,
        },
        {
          $project: canManageInventory
            ? {
                _id: 1,
                businessId: 1,
                productId: 1,
                quantity: 1,
                lowStockThreshold: 1,
                lowStock: 1,
                product: 1,
                createdAt: 1,
                updatedAt: 1,
              }
            : {
                _id: 0,
                productId: 1,
                quantity: 1,
                "product.name": 1,
              },
        },
      ],
      total: [
        {
          $count: "count",
        },
      ],
    },
  });

  const [result] = await Inventory.aggregate<InventoryListResult>(
    pipeline,
  );

  const total = result?.total[0]?.count ?? 0;

  const inventory = (result?.items ?? []).map((item) => {
    if (!canManageInventory) {
      return {
        productId: item.productId.toString(),
        name: item.product.name,
        quantity: item.quantity,
      };
    }

    return {
      id: item._id.toString(),
      businessId: business._id.toString(),
      productId: item.productId.toString(),
      name: item.product.name,
      status: item.product.status,
      quantity: item.quantity,
      lowStockThreshold: item.lowStockThreshold,
      lowStock: item.lowStock,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  });

  return {
    inventory,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };
}