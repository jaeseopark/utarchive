declare module "otpauth" {
  export interface TOTPOptions {
    secret: string;
    algorithm?: string;
    digits?: number;
    period?: number;
  }

  export class TOTP {
    constructor(options: TOTPOptions);
    validate(options: { token: string; window?: number }): number | null;
  }
}
