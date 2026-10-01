import "server-only";
import type { Model } from "mongoose";
import { connectDB } from "@/lib/db/connect";

import { User } from "@/models/User";
import { Business } from "@/models/Business";
import { BusinessMembership } from "@/models/BusinessMembership";
import { Session } from "@/models/Session";
import { PasswordResetToken } from "@/models/PasswordResetToken";
import { StaffInvitation } from "@/models/StaffInvitation";
import { Customer } from "@/models/Customer";
import { Category } from "@/models/Category";
import { Product } from "@/models/Product";
import { Inventory } from "@/models/Inventory";
import { InventoryAdjustment } from "@/models/InventoryAdjustment";
import { Order } from "@/models/Order";
import { Invoice } from "@/models/Invoice";
import { Media } from "@/models/Media";
import { AuditLog } from "@/models/AuditLog";

async function initializeModel<T>(model: Model<T>) {
  await model.createCollection();
  await model.createIndexes();

  const indexes = await model.listIndexes();

  return {
    model: model.modelName,
    collection: model.collection.collectionName,
    indexes: indexes.map((index) => ({
      name: index.name,
      key: index.key,
      unique: index.unique ?? false,
      expireAfterSeconds: index.expireAfterSeconds,
      partialFilterExpression: index.partialFilterExpression,
    })),
  };
}

export async function initializeDevelopmentDatabase() {
  if (process.env.NODE_ENV !== "development") {
    throw new Error("Database initialization is development-only.");
  }

  await connectDB();

  const tasks = [
    () => initializeModel(User),
    () => initializeModel(Business),
    () => initializeModel(BusinessMembership),
    () => initializeModel(Session),
    () => initializeModel(PasswordResetToken),
    () => initializeModel(StaffInvitation),
    () => initializeModel(Customer),
    () => initializeModel(Category),
    () => initializeModel(Product),
    () => initializeModel(Inventory),
    () => initializeModel(InventoryAdjustment),
    () => initializeModel(Order),
    () => initializeModel(Invoice),
    () => initializeModel(Media),
    () => initializeModel(AuditLog),
  ];

  const results = [];

  for (const task of tasks) {
    results.push(await task());
  }

  return results;
}