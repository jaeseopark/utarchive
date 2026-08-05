import { Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";

// Extend Express Request with requestId and originId properties
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      requestId?: string;
      originId?: string;
    }
  }
}

interface RequestWithId extends Request {
  requestId?: string;
  originId?: string;
}

/**
 * Middleware to attach a request ID to each request.
 * Uses the X-Request-ID header if provided, otherwise generates a new UUID.
 * This is used for WebSocket message deduplication on the client side.
 * Also captures X-Origin-ID header for identifying the originating UI instance.
 */
export const requestIdMiddleware = (req: RequestWithId, res: Response, next: NextFunction) => {
  const headerValue = req.headers["x-request-id"];
  const requestId = typeof headerValue === "string" ? headerValue : uuidv4();
  req.requestId = requestId;
  res.setHeader("X-Request-ID", requestId);

  // Capture origin ID from request headers
  if (typeof req.headers["x-origin-id"] === "string") {
    req.originId = req.headers["x-origin-id"];
  }

  next();
};

