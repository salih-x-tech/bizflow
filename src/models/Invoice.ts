import "server-only";
import mongoose, { Schema, type Model, type Types } from "mongoose";
import type { IOrderItem } from "@/models/Order";

interface IContactSnapshot {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
}

export interface IInvoice {
  businessId: Types.ObjectId;
  orderId: Types.ObjectId;
  invoiceNumber: string;
  businessSnapshot: IContactSnapshot;
  customerSnapshot: IContactSnapshot;
  itemsSnapshot: IOrderItem[];
  subtotal: number;
  totalAmount: number;
  currency: string;
  status: "Issued" | "Voided";
  issuedAt: Date;
  voidedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const contactSnapshotSchema = new Schema<IContactSnapshot>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    email: { type: String, maxlength: 254 },
    phone: { type: String, maxlength: 30 },
    address: { type: String, maxlength: 500 },
  },
  { _id: false },
);

const moneyField = () => ({
  type: Number,
  required: true,
  min: 0,
  validate: {
    validator: Number.isFinite,
    message: "Amount must be a finite number.",
  },
});

const itemSnapshotSchema = new Schema<IOrderItem>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    productNameSnapshot: {
      type: String,
      required: true,
      maxlength: 150,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isSafeInteger,
        message: "Quantity must be a positive safe whole number.",
      },
    },
    unitPriceAtOrder: moneyField(),
    lineTotal: moneyField(),
  },
  { _id: false },
);

const invoiceSchema = new Schema<IInvoice>(
  {
    businessId: {
      type: Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      immutable: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      unique: true,
      immutable: true,
    },
    invoiceNumber: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
      immutable: true,
    },
    businessSnapshot: {
      type: contactSnapshotSchema,
      required: true,
      immutable: true,
    },
    customerSnapshot: {
      type: contactSnapshotSchema,
      required: true,
      immutable: true,
    },
    itemsSnapshot: {
      type: [itemSnapshotSchema],
      required: true,
      immutable: true,
      validate: {
        validator: (items: IOrderItem[]) => items.length > 0,
        message: "An invoice must contain at least one item.",
      },
    },
    subtotal: {
      ...moneyField(),
      immutable: true,
    },
    totalAmount: {
      ...moneyField(),
      immutable: true,
    },
    currency: {
      type: String,
      required: true,
      uppercase: true,
      match: /^[A-Z]{3}$/,
      immutable: true,
    },
    status: {
      type: String,
      enum: ["Issued", "Voided"],
      default: "Issued",
      required: true,
    },
    issuedAt: {
      type: Date,
      required: true,
      immutable: true,
    },
    voidedAt: {
      type: Date,
    },
  },
  { timestamps: true },
);

invoiceSchema.index(
  { businessId: 1, invoiceNumber: 1 },
  { unique: true },
);

invoiceSchema.index({ businessId: 1, status: 1, issuedAt: -1 });

export const Invoice =
  (mongoose.models.Invoice as Model<IInvoice> | undefined) ??
  mongoose.model<IInvoice>("Invoice", invoiceSchema);