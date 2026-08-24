import { z } from "zod";

export const createProjectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(60, "Name must be at most 60 characters"),
  description: z.string().trim().max(300, "Description must be at most 300 characters").optional(),
});

export type CreateProjectValues = z.infer<typeof createProjectSchema>;

export const updateProjectSchema = createProjectSchema;

export const slugParamSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid project identifier"),
});
