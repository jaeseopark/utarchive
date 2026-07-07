import crypto from "crypto";
import { z } from "zod";
import base32Encode from "base32-encode";

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

/**
 * Derives a valid Base32 TOTP secret from an arbitrary human-readable string
 * using SHA-256 hashing and Base32 encoding.
 *
 * This allows users to provide memorable passphrases instead of random Base32 strings.
 * The derivation is deterministic - the same input always produces the same output.
 *
 * @param passphrase - The user-provided passphrase (e.g., "my-secret-phrase")
 * @returns A valid Base32 TOTP secret
 */
export const deriveTotpSecretFromPassphrase = (passphrase: string): string => {
  // Step 1: SHA256 hash the passphrase to get deterministic bytes
  const hashBuffer = crypto.createHash("sha256").update(passphrase).digest();

  // Step 2: Base32 encode the hash (uppercase for spec compliance)
  const base32String = base32Encode(hashBuffer, "RFC4648", { padding: false });

  return base32String;
};

/**
 * Creates a SHA256 hash of a TOTP key for fingerprinting/tracking.
 *
 * This allows the system to remember which specific TOTP key
 * (derived from the env var) a user registered with.
 * If the env var TOTP key changes, this hash changes, triggering re-registration.
 *
 * @param totpKey - The TOTP key (derived Base32 string)
 * @returns Hex digest of SHA256(totpKey)
 */
export const hashTotpKey = (totpKey: string): string => {
  return crypto.createHash("sha256").update(totpKey).digest("hex");
};
