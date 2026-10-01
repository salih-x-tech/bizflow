import "server-only";
import mongoose, { Schema, type Model, type Types } from "mongoose";

export interface ISession {
  userId: Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
  revokedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const sessionSchema = new Schema<ISession>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
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
    },
    revokedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

sessionSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 },
);

export const Session =
  (mongoose.models.Session as Model<ISession> | undefined) ??
  mongoose.model<ISession>("Session", sessionSchema);