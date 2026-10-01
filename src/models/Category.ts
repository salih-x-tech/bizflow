import "server-only";
import mongoose, { Schema, type Model, type Types } from "mongoose";

export interface ICategory {
  businessId: Types.ObjectId;
  name: string;
  normalizedName: string;
  description?: string;
  status: "Active" | "Archived";
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new Schema<ICategory>(
  {
    businessId: {
      type: Schema.Types.ObjectId,
      ref: "Business",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    normalizedName: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
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

categorySchema.pre("validate", function () {
  if (typeof this.name === "string") {
    this.normalizedName = this.name.trim().toLowerCase();
  }
});

categorySchema.index({ businessId: 1, status: 1 });

categorySchema.index(
  { businessId: 1, normalizedName: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "Active" },
  },
);

export const Category =
  (mongoose.models.Category as Model<ICategory> | undefined) ??
  mongoose.model<ICategory>("Category", categorySchema);