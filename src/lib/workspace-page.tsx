import "server-only";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppError } from "@/lib/errors";
import type { BusinessPermission } from "@/lib/permissions";
import { requirePageUser } from "@/lib/auth/require-page-user";
import { requireBusinessAccess } from "@/services/business/business-access.service";
import { requireBusinessOwner } from "@/services/business/business-owner.service";
import { Panel } from "@/components/workspace/data-view";
import { ZodError } from "zod";
export type WorkspaceProps = { params: Promise<{ businessId: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };
export function queryValues(input: Record<string, string | string[] | undefined>, allowed: string[]) { return Object.fromEntries(allowed.flatMap((key) => typeof input[key] === "string" && input[key] !== "" ? [[key, input[key] as string]] : [])); }
export async function pageAccess(businessId: string, permission?: BusinessPermission | "owner") {
  const user = await requirePageUser();
  const access = permission === "owner" ? await requireBusinessOwner(user.id, businessId) : await requireBusinessAccess(user.id, businessId, permission);
  return { user, ...access };
}
export function pageError(error: unknown) {
  if (error instanceof AppError && (error.statusCode === 404 || error.code.startsWith("INVALID_") && error.code.endsWith("_ID"))) notFound();
  if (error instanceof AppError && error.statusCode < 500 || error instanceof ZodError) return <Panel title={error instanceof AppError && error.statusCode === 403 ? "Access required" : "Check your request"}><p role="alert" className="form-error">{error instanceof ZodError ? error.issues.map((issue) => issue.message).join(" ") : error.message}</p><Link className="secondary-button" href="?">Clear filters</Link><Link className="secondary-button" href="/">Back to businesses</Link></Panel>;
  throw error;
}
