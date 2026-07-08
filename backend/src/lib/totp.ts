import { TOTP } from "otpauth";
import QRCode from "qrcode";

const TOTP_CONFIG = {
  // eslint-disable-next-line no-restricted-syntax
  algorithm: "SHA1" as const,
  digits: 6,
  period: 30,
  window: 1,
};

export const validateTotp = (secret: string, code: string): boolean => {
  try {
    const totp = new TOTP({
      secret,
      ...TOTP_CONFIG,
    });

    return totp.validate({ token: code, window: TOTP_CONFIG.window }) !== null;
  } catch {
    return false;
  }
};

/**
 * Generates a QR code for TOTP setup using an already-derived secret.
 * The secret should be a valid Base32 string (typically derived via double hashing).
 *
 * @param secret - The TOTP secret (Base32 encoded)
 * @param userId - The user's ID for the authenticator label
 * @param issuer - The app name displayed in authenticator apps (default: "utarchive")
 * @returns A data URL of the QR code
 */
export const generateTotpQrCode = async (
  secret: string,
  userId: string,
  issuer: string = "utarchive"
): Promise<string> => {
  // Create the TOTP URI for the QR code
  const otpauth_url = `otpauth://totp/${issuer}:${userId}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;

  const qrCodeDataUrl = await QRCode.toDataURL(otpauth_url);
  return qrCodeDataUrl;
};
