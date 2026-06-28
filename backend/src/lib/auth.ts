import crypto from "crypto";
import { z } from "zod";

const authCredentialsSchema = z.object({
  id: z.string().min(1),
  password: z.string().min(1),
  totpKey: z.string().min(1),
});

export const parseAuthCredentials = (value: string) => {
  const [id, password, totpKey] = value.split(",");
  const result = authCredentialsSchema.safeParse({ id, password, totpKey });

  if (!result.success) {
    throw new Error("AUTH_CREDENTIALS must be formatted as id,password,totp_key");
  }

  return result.data;
};

export const timingSafeEqual = (left: string, right: string) => {
  const leftBuffer = Buffer.from(left, "utf8");
  const rightBuffer = Buffer.from(right, "utf8");

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
};
