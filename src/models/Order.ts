import "server-only";
import mongoose, { Schema, type Model, type Types } from "mongoose";

export interface IOrderItem {
  productId: Types.ObjectId;
  productNameSnapshot: string;
  quantity: number;
  unitPriceAtOrder: number;
  lineTotal: number;
}

export interface IOrder {
  businessId: Types.ObjectId;
  customerId: Types.ObjectId;
  items: IOrderItem[];
  totalAmount: number;
  status: "Pending" | "Completed" | "Cancelled";
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const orderItemSchema = new Schema<IOrderItem>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    productNameSnapshot: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isSafeInteger,
        message: "Quantity must be a positive safe whole number.",
      },
    },
    unitPriceAtOrder: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isFinite,
        message: "Unit price must be a finite number.",
      },
    },
    lineTotal: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isFinite,
        message: "Line total must be a finite number.",
      },
    },
  },
  {
    _id: false,
  },
);

const orderSchema = new Schema<IOrder>(
  {
    businessId: {
      type: Schema.Types.ObjectId,
      ref: "Business",
      required: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: (items: IOrderItem[]) => items.length > 0,
        message: "An order must contain at least one item.",
      },
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isFinite,
        message: "Order total must be a finite number.",
      },
    },
    status: {
      type: String,
      enum: ["Pending", "Completed", "Cancelled"],
      default: "Pending",
      required: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

orderSchema.index({ businessId: 1, status: 1, createdAt: -1 });
orderSchema.index({ businessId: 1, customerId: 1, createdAt: -1 });

export const Order =
  (mongoose.models.Order as Model<IOrder> | undefined) ??
  mongoose.model<IOrder>("Order", orderSchema);
  