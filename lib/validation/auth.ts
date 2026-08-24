import { z } from "zod";

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(80, "Name must be at most 80 characters"),
  email: z
    .email("Enter a valid email address")
    .max(254)
    .transform((value) => value.toLowerCase()),
  password: z
    .string()
    .min(10, "Password must be at least 10 characters")
    .max(200, "Password must be at most 200 characters"),
});

export type RegisterValues = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.email("Enter a valid email address").max(254),
  password: z.string().min(1, "Password is required"),
});

export type LoginValues = z.infer<typeof loginSchema>;
