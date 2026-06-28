declare module "otpauth" {
  export interface TOTPOptions {
    secret: string;
    algorithm?: string;
    digits?: number;
    period?: number;
    encoding?: "ascii" | "hex" | "base32" | "base64";
  }

  export class TOTP {
    constructor(options: TOTPOptions);
    validate(options: { token: string; window?: number }): number | null;
  }
}
