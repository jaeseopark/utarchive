import { NextFunction, Request, Response } from "express";
import { verifyJwt } from "../lib/jwt";

export interface AuthenticatedRequest extends Request {
  user?: {
    sub: string;
  };
}

const extractSessionToken = (cookieHeader: string | undefined): string | null => {
  if (!cookieHeader) {
    return null;
  }

  const cookie = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("session="));

  if (!cookie) {
    return null;
  }

  return decodeURIComponent(cookie.split("=")[1] ?? "");
};

export const requireAuth = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const token = extractSessionToken(req.headers.cookie);

  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    req.user = verifyJwt(token);
    return next();
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }
};
