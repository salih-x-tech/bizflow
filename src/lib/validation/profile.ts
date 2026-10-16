import "server-only";
import { z } from "zod";

export const updateProfileSchema = z.strictObject({
  name: z.string().trim().min(2, "Name must contain at least 2 characters.").max(100),
  phone: z.string().trim().max(40).refine(
    (value) => !value || /^[+\d\s().-]+$/.test(value),
    "Enter a valid contact number.",
  ),
  bio: z.string().trim().max(500),
});
