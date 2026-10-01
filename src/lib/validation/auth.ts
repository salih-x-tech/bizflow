import "server-only";
import { z } from "zod";
import {
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_BYTES,
} from "@/lib/auth/password";

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, "Email must not exceed 254 characters.")
  .pipe(z.email({ error: "Enter a valid email address." }));

function fitsPasswordByteLimit(password: string): boolean {
  return new TextEncoder().encode(password).length <= MAX_PASSWORD_BYTES;
}

export const newPasswordSchema = z
  .string()
  .min(
    MIN_PASSWORD_LENGTH,
    `Password must contain at least ${MIN_PASSWORD_LENGTH} characters.`,
  )
  .max(MAX_PASSWORD_BYTES, "Password is too long.")
  .refine(fitsPasswordByteLimit, {
    error: `Password must not exceed ${MAX_PASSWORD_BYTES} UTF-8 bytes.`,
  });

const loginPasswordSchema = z
  .string()
  .min(1, "Password is required.")
  .max(MAX_PASSWORD_BYTES, "Password is too long.")
  .refine(fitsPasswordByteLimit, {
    error: `Password must not exceed ${MAX_PASSWORD_BYTES} UTF-8 bytes.`,
  });

export const registerSchema = z
  .strictObject({
    name: z
      .string()
      .trim()
      .min(2, "Name must contain at least 2 characters.")
      .max(100, "Name must not exceed 100 characters."),
    email: emailSchema,
    password: newPasswordSchema,
    confirmPassword: loginPasswordSchema,
  })
  .refine((data) => data.password === data.confirmPassword, {
    error: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const loginSchema = z.strictObject({
  email: emailSchema,
  password: loginPasswordSchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;