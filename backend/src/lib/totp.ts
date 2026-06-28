import { TOTP } from "otpauth";

export const validateTotp = (secret: string, code: string): boolean => {
  try {
    const totp = new TOTP({
      secret,
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      encoding: "base32",
    });

    return totp.validate({ token: code, window: 1 }) !== null;
  } catch {
    return false;
  }
};
