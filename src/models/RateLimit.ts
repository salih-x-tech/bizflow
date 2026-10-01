import "server-only";
import mongoose, { Schema, type Model } from "mongoose";

export interface IRateLimit {
  key: string;
  count: number;
  expiresAt: Date;
  createdAt: Date;
}

const rateLimitSchema = new Schema<IRateLimit>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      maxlength: 128,
    },
    count: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isSafeInteger,
        message: "Rate-limit count must be a safe whole number.",
      },
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

rateLimitSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 },
);

export const RateLimit =
  (mongoose.models.RateLimit as Model<IRateLimit> | undefined) ??
  mongoose.model<IRateLimit>("RateLimit", rateLimitSchema);