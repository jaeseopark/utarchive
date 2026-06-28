import jwt from "jsonwebtoken";
import { config } from "../config";

const secret = config.JWT_SECRET;

export type JwtPayload = {
  sub: string;
};

export const signJwt = (payload: JwtPayload, ttlSeconds: number) => {
  return jwt.sign(payload, secret, { expiresIn: ttlSeconds });
};

export const verifyJwt = (token: string): JwtPayload => {
  const decoded = jwt.verify(token, secret);

  if (typeof decoded !== "object" || decoded === null || typeof decoded.sub !== "string") {
    throw new Error("Invalid token payload");
  }

  return { sub: decoded.sub };
};
