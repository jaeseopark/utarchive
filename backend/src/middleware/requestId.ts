import { Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";

// Extend Express Request with requestId property
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

interface RequestWithId extends Request {
  requestId?: string;
}

/**
 * Middleware to attach a request ID to each request.
 * Uses the X-Request-ID header if provided, otherwise generates a new UUID.
 * This is used for WebSocket message deduplication on the client side.
 */
export const requestIdMiddleware = (
  req: RequestWithId,
  res: Response,
  next: NextFunction
) => {
  const headerValue = req.headers["x-request-id"];
  const requestId = typeof headerValue === "string" ? headerValue : uuidv4();
  req.requestId = requestId;
  res.setHeader("X-Request-ID", requestId);
  next();
};
