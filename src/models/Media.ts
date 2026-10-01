import "server-only";
import mongoose, { Schema, type Model, type Types } from "mongoose";

export interface IMedia {
  businessId: Types.ObjectId;
  publicId: string;
  url: string;
  mimeType: string;
  uploadedBy: Types.ObjectId;
  uploadedAt: Date;
}

const mediaSchema = new Schema<IMedia>(
  {
    businessId: {
      type: Schema.Types.ObjectId,
      ref: "Business",
      required: true,
    },
    publicId: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    url: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2048,
      validate: {
        validator: (value: string) => {
          try {
            return new URL(value).protocol === "https:";
          } catch {
            return false;
          }
        },
        message: "Media URL must be a valid HTTPS URL.",
      },
    },
    mimeType: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 100,
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    uploadedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
);

mediaSchema.index({ businessId: 1, uploadedAt: -1 });

mediaSchema.index(
  { businessId: 1, publicId: 1 },
  { unique: true },
);

export const Media =
  (mongoose.models.Media as Model<IMedia> | undefined) ??
  mongoose.model<IMedia>("Media", mediaSchema);