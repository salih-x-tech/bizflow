import "server-only";
import Decimal from "decimal.js";
import type { Types } from "mongoose";
import { AppError } from "@/lib/errors";
import { reportQuerySchema } from "@/lib/validation/report";
import { Invoice } from "@/models/Invoice";
import { requireBusinessAccess } from "@/services/business/business-access.service";

interface SalesReportResult {
  summary: {
    invoiceCount: number;
    totalRevenue: string;
  }[];

  invoices: {
    _id: Types.ObjectId;
    orderId: Types.ObjectId;
    invoiceNumber: string;
    customerSnapshot: {
      name: string;
    };
    totalAmount: number;
    currency: string;
    issuedAt: Date;
  }[];
}

export async function getSalesReport(
  authenticatedUserId: string,
  businessId: string,
  input: unknown,
) {
  const { business } = await requireBusinessAccess(
    authenticatedUserId,
    businessId,
    "canViewReports",
  );

  const query = reportQuerySchema.parse(input);

  if (query.type !== "sales") {
    throw new AppError(
      "INVALID_REPORT_TYPE",
      "This service only supports sales reports.",
      400,
    );
  }

  const [result] = await Invoice.aggregate<SalesReportResult>([
    {
      $match: {
        businessId: business._id,
        status: "Issued",
        issuedAt: {
          $gte: query.rangeStart,
          $lt: query.rangeEndExclusive,
        },
      },
    },
    {
      $facet: {
        summary: [
          {
            $group: {
              _id: null,
              invoiceCount: { $sum: 1 },
              totalRevenue: {
                $sum: {
                  $toDecimal: { $toString: "$totalAmount" },
                },
              },
            },
          },
          {
            $project: {
              _id: 0,
              invoiceCount: 1,
              totalRevenue: { $toString: "$totalRevenue" },
            },
          },
        ],
        invoices: [
          { $sort: { issuedAt: -1, _id: -1 } },
          { $skip: (query.page - 1) * query.limit },
          { $limit: query.limit },
          {
            $project: {
              _id: 1,
              orderId: 1,
              invoiceNumber: 1,
              "customerSnapshot.name": 1,
              totalAmount: 1,
              currency: 1,
              issuedAt: 1,
            },
          },
        ],
      },
    },
  ]);

  const summary = result?.summary[0];
  const decimalTotal = new Decimal(
    summary?.totalRevenue ?? "0",
  );
  const totalRevenue = decimalTotal.toNumber();

  if (
    !decimalTotal.isFinite() ||
    decimalTotal.lt(0) ||
    decimalTotal.gt(Number.MAX_SAFE_INTEGER) ||
    !new Decimal(totalRevenue.toString()).eq(decimalTotal)
  ) {
    throw new AppError(
      "REVENUE_AMOUNT_OUT_OF_RANGE",
      "The sales total exceeds the supported numeric range.",
      400,
    );
  }

  const total = summary?.invoiceCount ?? 0;

  return {
    type: "sales" as const,
    businessId: business._id.toString(),
    dateRange: {
      from: query.from,
      to: query.to,
      timezone: "UTC",
    },
    summary: {
      totalRevenue,
      invoiceCount: total,
      currency: business.currency,
    },
    invoices: (result?.invoices ?? []).map((invoice) => ({
      id: invoice._id.toString(),
      orderId: invoice.orderId.toString(),
      invoiceNumber: invoice.invoiceNumber,
      customerName: invoice.customerSnapshot.name,
      totalAmount: invoice.totalAmount,
      currency: invoice.currency,
      issuedAt: invoice.issuedAt,
    })),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };
}
