import "server-only";
import { Types, type ClientSession } from "mongoose";
import { AppError } from "@/lib/errors";
import {
  calculateLineTotal,
  calculateOrderTotal,
} from "@/lib/money";
import {
  createOrderSchema,
  type CreateOrderInput,
} from "@/lib/validation/order";
import type { IOrderItem } from "@/models/Order";
import { Product } from "@/models/Product";

export async function buildOrderItems(
  businessId: Types.ObjectId,
  requestedItems: CreateOrderInput["items"],
  databaseSession: ClientSession,
  previousItems: readonly IOrderItem[] = [],
) {
  const validatedItems =
    createOrderSchema.shape.items.parse(requestedItems);

  const previousByProduct = new Map(
    previousItems.map((item) => [
      item.productId.toString(),
      item,
    ]),
  );

  const itemsToRefresh = validatedItems.filter((item) => {
    const previous = previousByProduct.get(item.productId);

    return !previous || previous.quantity !== item.quantity;
  });

  const products = itemsToRefresh.length > 0
    ? await Product.find({
        _id: {
          $in: itemsToRefresh.map(
            (item) => new Types.ObjectId(item.productId),
          ),
        },
        businessId,
        status: "Active",
      })
        .select("_id name price")
        .session(databaseSession)
        .lean()
    : [];

  if (products.length !== itemsToRefresh.length) {
    throw new AppError(
      "PRODUCT_NOT_FOUND",
      "Every new or changed item must reference an active product in this business.",
      404,
    );
  }

  const productsById = new Map(
    products.map((product) => [
      product._id.toString(),
      product,
    ]),
  );

  const items: IOrderItem[] = validatedItems.map((item) => {
    const previous = previousByProduct.get(item.productId);

    if (previous && previous.quantity === item.quantity) {
      return {
        productId: previous.productId,
        productNameSnapshot: previous.productNameSnapshot,
        quantity: previous.quantity,
        unitPriceAtOrder: previous.unitPriceAtOrder,
        lineTotal: calculateLineTotal(
          previous.unitPriceAtOrder,
          previous.quantity,
        ),
      };
    }

    const product = productsById.get(item.productId);

    if (!product) {
      throw new AppError(
        "PRODUCT_NOT_FOUND",
        "Product was not found.",
        404,
      );
    }

    return {
      productId: product._id,
      productNameSnapshot: product.name,
      quantity: item.quantity,
      unitPriceAtOrder: product.price,
      lineTotal: calculateLineTotal(
        product.price,
        item.quantity,
      ),
    };
  });

  return {
    items,
    totalAmount: calculateOrderTotal(
      items.map((item) => item.lineTotal),
    ),
  };
}