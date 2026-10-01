import "server-only";
import mongoose, { Schema, type Model } from "mongoose";

export interface IUser {
  name: string;
  email: string;
  passwordHash: string;
  status: "Active" | "Disabled";
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      maxlength: 254,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    status: {
      type: String,
      enum: ["Active", "Disabled"],
      default: "Active",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

export const User =
  (mongoose.models.User as Model<IUser> | undefined) ??
  mongoose.model<IUser>("User", userSchema);
