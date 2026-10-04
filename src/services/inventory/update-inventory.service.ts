import "server-only";
import { Types } from "mongoose";
import { connectDB } from "@/lib/db/connect";
import { AppError } from "@/lib/errors";
import { updateInventorySchema } from "@/lib/validation/inventory";
import { AuditLog } from "@/models/AuditLog";
import { Inventory } from "@/models/Inventory";
import { InventoryAdjustment } from "@/models/InventoryAdjustment";
import { Product } from "@/models/Product";
import { requireBusinessAccess } from "@/services/business/business-access.service";
import { assertTransactionPermission } from "@/services/business/transaction-permission.service";

export async function updateInventory(
  authenticatedUserId: string,
  businessId: string,
  productId: string,
  input: unknown,
) {
  const { business, membership } = await requireBusinessAccess(
    authenticatedUserId,
    businessId,
    "canManageInventory",
  );

  if (!/^[a-fA-F0-9]{24}$/.test(productId)) {
    throw new AppError(
      "INVALID_PRODUCT_ID",
      "Enter a valid product ID.",
      400,
    );
  }

  const data = updateInventorySchema.parse(input);
  const productObjectId = new Types.ObjectId(productId);
  const connection = await connectDB();

  await Promise.all([
    Inventory.init(),
    InventoryAdjustment.init(),
    AuditLog.init(),
  ]);

  return connection.connection.transaction(
    async (databaseSession) => {
      await assertTransactionPermission(
        membership.userId,
        business._id,
        "canManageInventory",
        databaseSession,
      );

      const product = await Product.exists({
        _id: productObjectId,
        businessId: business._id,
      }).session(databaseSession);

      if (!product) {
        throw new AppError(
          "PRODUCT_NOT_FOUND",
          "Product was not found.",
          404,
        );
      }

      const inventory = await Inventory.findOne({
        businessId: business._id,
        productId: productObjectId,
      }).session(databaseSession);

      if (!inventory) {
        throw new AppError(
          "INVENTORY_NOT_FOUND",
          "Inventory was not found for this product.",
          404,
        );
      }

      const previousQuantity = inventory.quantity;
      const previousThreshold = inventory.lowStockThreshold;

      const hasAdjustment =
        data.type !== undefined && data.quantity !== undefined;

      let quantityChange = 0;

      if (hasAdjustment) {
        quantityChange =
          data.type === "MANUAL_INCREASE"
            ? data.quantity!
            : -data.quantity!;

        const newQuantity = previousQuantity + quantityChange;

        if (newQuantity < 0) {
          throw new AppError(
            "INSUFFICIENT_STOCK",
            "The decrease exceeds available stock.",
            409,
          );
        }

        if (!Number.isSafeInteger(newQuantity)) {
          throw new AppError(
            "INVALID_STOCK_QUANTITY",
            "The resulting stock must be a safe whole number.",
            400,
          );
        }

        inventory.quantity = newQuantity;
      }

      if (data.lowStockThreshold !== undefined) {
        inventory.set(
          "lowStockThreshold",
          data.lowStockThreshold === null
            ? undefined
            : data.lowStockThreshold,
        );
      }

      await inventory.save({
        session: databaseSession,
      });

      if (hasAdjustment) {
        await InventoryAdjustment.create(
          [
            {
              businessId: business._id,
              productId: productObjectId,
              userId: membership.userId,
              type: data.type,
              quantityChange,
              previousQuantity,
              newQuantity: inventory.quantity,
              reason: data.reason,
            },
          ],
          {
            session: databaseSession,
            ordered: true,
          },
        );
      }

      await AuditLog.create(
        [
          {
            scope: "Business",
            businessId: business._id,
            userId: membership.userId,
            action: hasAdjustment
              ? "INVENTORY_ADJUSTED"
              : "INVENTORY_THRESHOLD_UPDATED",
            entityType: "Inventory",
            entityId: inventory._id,
            details: {
              fields: Object.keys(data),
              adjustmentType: data.type,
              quantityChange,
              previousQuantity,
              newQuantity: inventory.quantity,
              previousThreshold: previousThreshold ?? null,
              lowStockThreshold: inventory.lowStockThreshold ?? null,
            },
          },
        ],
        {
          session: databaseSession,
          ordered: true,
        },
      );

      return {
        id: inventory._id.toString(),
        businessId: inventory.businessId.toString(),
        productId: inventory.productId.toString(),
        quantity: inventory.quantity,
        lowStockThreshold: inventory.lowStockThreshold,
        lowStock:
          inventory.lowStockThreshold !== undefined &&
          inventory.quantity <= inventory.lowStockThreshold,
        createdAt: inventory.createdAt,
        updatedAt: inventory.updatedAt,
      };
    },
    {
      readPreference: "primary",
    },
  );
}