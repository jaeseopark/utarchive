import { beforeAll, describe, expect, it, vi } from "vitest";

let signJwt: (payload: { sub: string }, ttlSeconds: number) => string;
let verifyJwt: (token: string) => { sub: string };

beforeAll(async () => {
  vi.stubEnv("JWT_SECRET", "test-secret");
  vi.stubEnv("AUTH_CREDENTIALS", "user,pass,totp");
  vi.stubEnv("DATABASE_URL", "postgres://localhost/test");
  vi.stubEnv("JWT_TTL_SECONDS", "60");
  vi.stubEnv("NODE_ENV", "development");
  const jwtHelpers = await import("./jwt");
  signJwt = jwtHelpers.signJwt;
  verifyJwt = jwtHelpers.verifyJwt;
});

describe("JWT helpers", () => {
  it("signs and verifies a token payload", () => {
    const token = signJwt({ sub: "user-123" }, 60);
    const payload = verifyJwt(token);

    expect(payload).toEqual({ sub: "user-123" });
  });

  it("throws when verifying an invalid token", () => {
    expect(() => verifyJwt("invalid-token")).toThrow();
  });
});
