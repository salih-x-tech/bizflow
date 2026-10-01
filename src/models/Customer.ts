import "server-only";
import mongoose, { Schema, type Model, type Types } from "mongoose";

export interface ICustomer {
  businessId: Types.ObjectId;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  status: "Active" | "Archived";
  createdAt: Date;
  updatedAt: Date;
}

const customerSchema = new Schema<ICustomer>(
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
    email: {
      type: String,
      maxlength: 254,
      set: (value: string | null | undefined) =>
        value?.trim().toLowerCase() || undefined,
    },
    phone: {
      type: String,
      trim: true,
      maxlength: 30,
    },
    address: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 2000,
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

customerSchema.index({ businessId: 1, status: 1 });

customerSchema.index(
  { businessId: 1, email: 1 },
  {
    unique: true,
    partialFilterExpression: {
      email: { $type: "string", $gt: "" },
    },
  },
);

export const Customer =
  (mongoose.models.Customer as Model<ICustomer> | undefined) ??
  mongoose.model<ICustomer>("Customer", customerSchema);