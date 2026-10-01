import "server-only";
import mongoose, { Schema, type Model, type Types } from "mongoose";

export interface IInventory {
  businessId: Types.ObjectId;
  productId: Types.ObjectId;
  quantity: number;
  lowStockThreshold?: number;
  createdAt: Date;
  updatedAt: Date;
}

const inventorySchema = new Schema<IInventory>(
  {
    businessId: {
      type: Schema.Types.ObjectId,
      ref: "Business",
      required: true,
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isSafeInteger,
        message: "Quantity must be a safe whole number.",
      },
    },
    lowStockThreshold: {
      type: Number,
      min: 0,
      validate: {
        validator: (value: number | null | undefined) =>
          value === undefined ||
          (typeof value === "number" && Number.isSafeInteger(value)),
        message: "Low-stock threshold must be a safe whole number.",
      },
    },
  },
  {
    timestamps: true,
  },
);

inventorySchema.index(
  { businessId: 1, productId: 1 },
  { unique: true },
);

export const Inventory =
  (mongoose.models.Inventory as Model<IInventory> | undefined) ??
  mongoose.model<IInventory>("Inventory", inventorySchema);