import "server-only";
import mongoose, { Schema, type Model, type Types } from "mongoose";

export interface IBusiness {
  name: string;
  ownerId: Types.ObjectId;
  currency: string;
  businessType: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  createdAt: Date;
  updatedAt: Date;
}

const businessSchema = new Schema<IBusiness>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    currency: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      match: /^[A-Z]{3}$/,
    },
    businessType: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    contactEmail: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 254,
    },
    contactPhone: {
      type: String,
      trim: true,
      maxlength: 30,
    },
    address: {
      type: String,
      trim: true,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
  },
);

export const Business =
  (mongoose.models.Business as Model<IBusiness> | undefined) ??
  mongoose.model<IBusiness>("Business", businessSchema);