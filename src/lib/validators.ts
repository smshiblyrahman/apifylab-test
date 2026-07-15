import { z } from "zod";

export const registerSchema = z.object({
  firstName: z.string().min(1, "First name required").max(50),
  lastName: z.string().min(1, "Last name required").max(50),
  email: z.string().email("Invalid email"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password required"),
});

export const createPostSchema = z.object({
  content: z.string().min(1, "Post cannot be empty").max(5000),
  visibility: z.enum(["PUBLIC", "PRIVATE"]).default("PUBLIC"),
  imageUrl: z.string().url().optional().nullable(),
});

export const createCommentSchema = z.object({
  content: z.string().min(1, "Comment cannot be empty").max(2000),
  postId: z.string().cuid(),
  parentId: z.string().cuid().optional().nullable(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreatePostInput = z.infer<typeof createPostSchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
