import "server-only";
import mongoose, { Schema, type Model, type Types } from "mongoose";

export interface IProduct {
  businessId: Types.ObjectId;
  categoryId: Types.ObjectId;
  name: string;
  description?: string;
  price: number;
  mediaIds: Types.ObjectId[];
  status: "Active" | "Archived";
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<IProduct>(
  {
    businessId: {
      type: Schema.Types.ObjectId,
      ref: "Business",
      required: true,
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 3000,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isFinite,
        message: "Price must be a finite number.",
      },
    },
    mediaIds: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: "Media",
        },
      ],
      default: [],
    },
    status: {
      type: String,
      enum: ["Active", "Archived"],
      default: "Active",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

productSchema.index({ businessId: 1, status: 1, name: 1 });
productSchema.index({ businessId: 1, categoryId: 1, status: 1 });

export const Product =
  (mongoose.models.Product as Model<IProduct> | undefined) ??
  mongoose.model<IProduct>("Product", productSchema);