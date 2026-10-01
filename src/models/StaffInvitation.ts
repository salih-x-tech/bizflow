import "server-only";
import mongoose, { Schema, type Model, type Types } from "mongoose";
import {
  BUSINESS_PERMISSIONS,
  type BusinessPermission,
} from "@/lib/permissions";

export interface IStaffInvitation {
  businessId: Types.ObjectId;
  email: string;
  invitedBy: Types.ObjectId;
  permissions: BusinessPermission[];
  status: "Pending" | "Accepted" | "Expired" | "Revoked";
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const staffInvitationSchema = new Schema<IStaffInvitation>(
  {
    businessId: {
      type: Schema.Types.ObjectId,
      ref: "Business",
      required: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
    },
    invitedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    permissions: {
      type: [String],
      enum: [...BUSINESS_PERMISSIONS],
      default: [],
    },
    status: {
      type: String,
      enum: ["Pending", "Accepted", "Expired", "Revoked"],
      default: "Pending",
      required: true,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      select: false,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

staffInvitationSchema.index({
  businessId: 1,
  email: 1,
  status: 1,
});

export const StaffInvitation =
  (mongoose.models.StaffInvitation as
    | Model<IStaffInvitation>
    | undefined) ??
  mongoose.model<IStaffInvitation>(
    "StaffInvitation",
    staffInvitationSchema,
  );