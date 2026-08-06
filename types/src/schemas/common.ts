import { z } from "zod";

/**
 * Pagination schema
 */
export const PaginationSchema = z.object({
  page: z.number().int().min(0),
  limit: z.number().int().min(1).max(100),
  hasMore: z.boolean(),
});

export type Pagination = z.infer<typeof PaginationSchema>;

/**
 * Error response schema
 */
export const ErrorResponseSchema = z.object({
  error: z.object({
    message: z.string(),
    code: z.string().optional(),
    data: z.unknown().optional(),
  }),
});

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
