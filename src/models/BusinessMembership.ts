import "server-only";
import mongoose, { Schema, type Model, type Types } from "mongoose";
import {
  BUSINESS_PERMISSIONS,
  type BusinessPermission,
} from "@/lib/permissions";

export interface IBusinessMembership {
  userId: Types.ObjectId;
  businessId: Types.ObjectId;
  role: "Owner" | "Staff";
  permissions: BusinessPermission[];
  status: "Active" | "Revoked";
  createdAt: Date;
  updatedAt: Date;
}

const businessMembershipSchema = new Schema<IBusinessMembership>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    businessId: {
      type: Schema.Types.ObjectId,
      ref: "Business",
      required: true,
    },
    role: {
      type: String,
      enum: ["Owner", "Staff"],
      required: true,
    },
    permissions: {
      type: [String],
      enum: [...BUSINESS_PERMISSIONS],
      default: [],
    },
    status: {
      type: String,
      enum: ["Active", "Revoked"],
      default: "Active",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

businessMembershipSchema.index(
  { businessId: 1, userId: 1 },
  { unique: true },
);

export const BusinessMembership =
  (mongoose.models.BusinessMembership as
    | Model<IBusinessMembership>
    | undefined) ??
  mongoose.model<IBusinessMembership>(
    "BusinessMembership",
    businessMembershipSchema,
  );