import "server-only";
import { listMediaQuerySchema } from "@/lib/validation/media";
import { Media } from "@/models/Media";
import { requireBusinessAccess } from "@/services/business/business-access.service";

export async function listMedia(
  authenticatedUserId: string,
  businessId: string,
  input: unknown,
) {
  const { business } = await requireBusinessAccess(
    authenticatedUserId,
    businessId,
    "canManageProducts",
  );

  const query = listMediaQuerySchema.parse(input);

  const filter = {
  businessId: business._id,
  status: { $ne: "Deleting" as const },
};

  const [records, total] = await Promise.all([
    Media.find(filter)
      .select(
        "_id businessId url mimeType uploadedBy uploadedAt",
      )
      .sort({ uploadedAt: -1, _id: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .lean(),

    Media.countDocuments(filter),
  ]);

  return {
    media: records.map((record) => ({
      id: record._id.toString(),
      businessId: record.businessId.toString(),
      url: record.url,
      mimeType: record.mimeType,
      uploadedBy: record.uploadedBy.toString(),
      uploadedAt: record.uploadedAt,
    })),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };
}