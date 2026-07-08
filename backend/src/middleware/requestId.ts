import { Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";

/**
 * Middleware to attach a request ID to each request.
 * Uses the X-Request-ID header if provided, otherwise generates a new UUID.
 * This is used for WebSocket message deduplication on the client side.
 */
export const requestIdMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const requestId = (req.headers["x-request-id"] as string) || uuidv4();
  (req as any).requestId = requestId;
  res.setHeader("X-Request-ID", requestId);
  next();
};
