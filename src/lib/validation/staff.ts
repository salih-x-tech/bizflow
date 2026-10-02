import "server-only";
import { z } from "zod";
import { isValidAuthToken } from "@/lib/auth/tokens";
import { BUSINESS_PERMISSIONS } from "@/lib/permissions";

const staffPermissionsSchema = z
  .array(z.enum(BUSINESS_PERMISSIONS))
  .max(
    BUSINESS_PERMISSIONS.length,
    "Too many permissions were provided.",
  )
  .refine(
    (permissions) => new Set(permissions).size === permissions.length,
    {
      error: "Duplicate permissions are not allowed.",
    },
  );

export const createStaffInvitationSchema = z.strictObject({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(254, "Email must not exceed 254 characters.")
    .pipe(z.email({ error: "Enter a valid email address." })),

  permissions: staffPermissionsSchema.default([]),
});

export const updateStaffPermissionsSchema = z.strictObject({
  permissions: staffPermissionsSchema,
});

export const acceptStaffInvitationSchema = z.strictObject({
  token: z.string().refine(isValidAuthToken, {
    error: "Invalid invitation token.",
  }),
});

export type CreateStaffInvitationInput = z.infer<
  typeof createStaffInvitationSchema
>;

export type UpdateStaffPermissionsInput = z.infer<
  typeof updateStaffPermissionsSchema
>;

export type AcceptStaffInvitationInput = z.infer<
  typeof acceptStaffInvitationSchema
>;