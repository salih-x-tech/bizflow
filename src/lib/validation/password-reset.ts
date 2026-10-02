import "server-only";
import { z } from "zod";
import { isValidAuthToken } from "@/lib/auth/tokens";
import { newPasswordSchema } from "@/lib/validation/auth";

export const forgotPasswordSchema = z.strictObject({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(254, "Email must not exceed 254 characters.")
    .pipe(z.email({ error: "Enter a valid email address." })),
});

export const resetPasswordSchema = z
  .strictObject({
    token: z.string().refine(isValidAuthToken, {
      error: "Invalid password-reset token.",
    }),
    password: newPasswordSchema,
    confirmPassword: newPasswordSchema,
  })
  .refine(
    (data) => data.password === data.confirmPassword,
    {
      error: "Passwords do not match.",
      path: ["confirmPassword"],
    },
  );

export type ForgotPasswordInput = z.infer<
  typeof forgotPasswordSchema
>;

export type ResetPasswordInput = z.infer<
  typeof resetPasswordSchema
>;