import { z } from "zod";

const envSchema = z.object({
  PORT: z.preprocess((value) => {
    if (typeof value === "string" && value.trim().length > 0) {
      return Number(value);
    }
    return 3000;
  }, z.number().int().positive()),
  DATABASE_URL: z.string().min(1),
  AUTH_CREDENTIALS: z.string().min(1),
  JWT_SECRET: z.string().min(1),
});

export const config = envSchema.parse(process.env);
