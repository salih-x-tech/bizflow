import "server-only";
import mongoose, { Schema, type Model, type Types } from "mongoose";

const ADJUSTMENT_TYPES = [
  "INITIAL_STOCK",
  "MANUAL_INCREASE",
  "MANUAL_DECREASE",
  "ORDER_DEDUCTION",
  "ORDER_REVERSAL",
] as const;

export type InventoryAdjustmentType =
  (typeof ADJUSTMENT_TYPES)[number];

export interface IInventoryAdjustment {
  businessId: Types.ObjectId;
  productId: Types.ObjectId;
  userId: Types.ObjectId;
  type: InventoryAdjustmentType;
  quantityChange: number;
  previousQuantity: number;
  newQuantity: number;
  orderId?: Types.ObjectId;
  reason?: string;
  createdAt: Date;
}

const inventoryAdjustmentSchema = new Schema<IInventoryAdjustment>(
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
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: [...ADJUSTMENT_TYPES],
      required: true,
    },
    quantityChange: {
      type: Number,
      required: true,
      validate: {
        validator: Number.isSafeInteger,
        message: "Quantity change must be a safe whole number.",
      },
    },
    previousQuantity: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isSafeInteger,
        message: "Previous quantity must be a safe whole number.",
      },
    },
    newQuantity: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isSafeInteger,
        message: "New quantity must be a safe whole number.",
      },
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
    },
    reason: {
      type: String,
      trim: true,
      maxlength: 500,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

inventoryAdjustmentSchema.index({
  businessId: 1,
  productId: 1,
  createdAt: -1,
});

inventoryAdjustmentSchema.index({
  businessId: 1,
  orderId: 1,
});

export const InventoryAdjustment =
  (mongoose.models.InventoryAdjustment as
    | Model<IInventoryAdjustment>
    | undefined) ??
  mongoose.model<IInventoryAdjustment>(
    "InventoryAdjustment",
    inventoryAdjustmentSchema,
  );