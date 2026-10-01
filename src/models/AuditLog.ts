import "server-only";
import mongoose, { Schema, type Model, type Types } from "mongoose";

export interface IAuditLog {
  scope: "Business" | "Account";
  businessId?: Types.ObjectId;
  userId?: Types.ObjectId;
  action: string;
  entityType: string;
  entityId?: Types.ObjectId;
  details: Record<string, unknown>;
  timestamp: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    scope: {
      type: String,
      enum: ["Business", "Account"],
      required: true,
      immutable: true,
    },
    businessId: {
      type: Schema.Types.ObjectId,
      ref: "Business",
      immutable: true,
      required: function (this: IAuditLog) {
        return this.scope === "Business";
      },
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      immutable: true,
      required: function (this: IAuditLog) {
        return this.scope === "Business";
      },
    },
    action: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
      immutable: true,
    },
    entityType: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
      immutable: true,
    },
    entityId: {
      type: Schema.Types.ObjectId,
      immutable: true,
    },
    details: {
      type: Schema.Types.Mixed,
      default: () => ({}),
      immutable: true,
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
      immutable: true,
    },
  },
);

auditLogSchema.pre("validate", function () {
  if (
    this.scope === "Account" &&
    this.businessId !== undefined &&
    this.businessId !== null
  ) {
    this.invalidate(
      "businessId",
      "Account audit records must not reference a business.",
    );
  }
});

auditLogSchema.index({
  scope: 1,
  businessId: 1,
  timestamp: -1,
});

auditLogSchema.index({
  scope: 1,
  userId: 1,
  timestamp: -1,
});

export const AuditLog =
  (mongoose.models.AuditLog as Model<IAuditLog> | undefined) ??
  mongoose.model<IAuditLog>("AuditLog", auditLogSchema);