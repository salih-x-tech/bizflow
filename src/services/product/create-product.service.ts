import "server-only";
import { Types } from "mongoose";
import { connectDB } from "@/lib/db/connect";
import { AppError } from "@/lib/errors";
import { createProductSchema } from "@/lib/validation/product";
import { AuditLog } from "@/models/AuditLog";
import { Category } from "@/models/Category";
import { Inventory } from "@/models/Inventory";
import { InventoryAdjustment } from "@/models/InventoryAdjustment";
import { Media } from "@/models/Media";
import { Product } from "@/models/Product";
import { requireBusinessAccess } from "@/services/business/business-access.service";
import { assertTransactionPermission } from "@/services/business/transaction-permission.service";
import { lockMediaReferences } from "@/services/media/lock-media-references.service";


export async function createProduct(
  authenticatedUserId: string,
  businessId: string,
  input: unknown,
) {
  const { business, membership } = await requireBusinessAccess(
    authenticatedUserId,
    businessId,
    "canManageProducts",
  );

  const data = createProductSchema.parse(input);
  const categoryId = new Types.ObjectId(data.categoryId);
  const mediaIds = data.mediaIds.map((id) => new Types.ObjectId(id));
  const connection = await connectDB();

    await Promise.all([
    Product.init(),
    Inventory.init(),
    InventoryAdjustment.init(),
    AuditLog.init(),
    Media.init(),
  ]);

  return connection.connection.transaction(
    async (databaseSession) => {
      await assertTransactionPermission(
        membership.userId,
        business._id,
        "canManageProducts",
        databaseSession,
      );

      const activeCategory = await Category.exists({
        _id: categoryId,
        businessId: business._id,
        status: "Active",
      }).session(databaseSession);

      if (!activeCategory) {
        throw new AppError(
          "CATEGORY_NOT_FOUND",
          "Select an active category from this business.",
          404,
        );
      }

        await lockMediaReferences(
        business._id,
        mediaIds,
        databaseSession,
      );

      const [product] = await Product.create(
        [
          {
            ...data,
            businessId: business._id,
            categoryId,
            mediaIds,
            status: "Active",
          },
        ],
        {
          session: databaseSession,
        },
      );

      if (!product) {
        throw new Error("Product creation failed.");
      }

      const [inventory] = await Inventory.create(
        [
          {
            businessId: business._id,
            productId: product._id,
            quantity: 0,
          },
        ],
        {
          session: databaseSession,
        },
      );

      if (!inventory) {
        throw new Error("Inventory creation failed.");
      }

      await InventoryAdjustment.create(
        [
          {
            businessId: business._id,
            productId: product._id,
            userId: membership.userId,
            type: "INITIAL_STOCK",
            quantityChange: 0,
            previousQuantity: 0,
            newQuantity: 0,
            reason: "Inventory initialized during product creation.",
          },
        ],
        {
          session: databaseSession,
        },
      );

      await AuditLog.create(
        [
          {
            scope: "Business",
            businessId: business._id,
            userId: membership.userId,
            action: "PRODUCT_CREATED",
            entityType: "Product",
            entityId: product._id,
            details: {},
          },
          {
            scope: "Business",
            businessId: business._id,
            userId: membership.userId,
            action: "INVENTORY_INITIALIZED",
            entityType: "Inventory",
            entityId: inventory._id,
            details: {
              quantity: 0,
            },
          },
        ],
        {
          session: databaseSession,
          ordered: true,
        },
      );

      return {
        id: product._id.toString(),
        businessId: product.businessId.toString(),
        categoryId: product.categoryId.toString(),
        name: product.name,
        description: product.description,
        price: product.price,
        mediaIds: product.mediaIds.map((id) => id.toString()),
        status: product.status,
        inventory: {
          id: inventory._id.toString(),
          quantity: inventory.quantity,
        },
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
      };
    },
    {
      readPreference: "primary",
    },
  );
}