import "server-only";
import { Types } from "mongoose";
import { AppError } from "@/lib/errors";
import { listAuditLogsQuerySchema } from "@/lib/validation/audit-log";
import { AuditLog } from "@/models/AuditLog";
import { requireBusinessAccess } from "@/services/business/business-access.service";

export async function listAuditLogs(
  authenticatedUserId: string,
  businessId: string,
  input: unknown,
) {
  const { business, membership } = await requireBusinessAccess(
    authenticatedUserId,
    businessId,
  );

  if (
    membership.role !== "Owner" ||
    business.ownerId.toString() !== authenticatedUserId.toLowerCase()
  ) {
    throw new AppError(
      "FORBIDDEN",
      "Only the business owner may view audit history.",
      403,
    );
  }

  const query = listAuditLogsQuerySchema.parse(input);

  const timestamp: {
    $gte?: Date;
    $lt?: Date;
  } = {};

  if (query.from) {
    timestamp.$gte = new Date(
      `${query.from}T00:00:00.000Z`,
    );
  }

  if (query.to) {
    const endExclusive = new Date(
      `${query.to}T00:00:00.000Z`,
    );

    endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);
    timestamp.$lt = endExclusive;
  }

  const filter = {
    scope: "Business" as const,
    businessId: business._id,

    ...(query.action
      ? { action: query.action }
      : {}),

    ...(query.entityType
      ? { entityType: query.entityType }
      : {}),

    ...(query.entityId
      ? { entityId: new Types.ObjectId(query.entityId) }
      : {}),

    ...(query.from || query.to
      ? { timestamp }
      : {}),
  };

  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .select(
        "_id businessId userId action entityType entityId details timestamp",
      )
      .sort({ timestamp: -1, _id: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .lean(),

    AuditLog.countDocuments(filter),
  ]);

  return {
    auditLogs: logs.map((log) => ({
      id: log._id.toString(),
      businessId: log.businessId?.toString(),
      userId: log.userId?.toString(),
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId?.toString(),
      details: log.details,
      timestamp: log.timestamp,
    })),

    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };
}