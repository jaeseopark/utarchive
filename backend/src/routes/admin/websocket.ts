import { Router, Request, Response } from "express";
import { getEventStats, getRecentEvents } from "../../lib/webSocketLogger";
import { requireAuth } from "../../middleware/requireAuth";

const router = Router();

// Protected route - requires authentication
router.use(requireAuth);

/**
 * Get WebSocket connection statistics
 */
router.get("/stats", (_req: Request, res: Response) => {
  try {
    const stats = getEventStats();
    const wss = _req.app.locals.wss;

    const response = {
      ...stats,
      activeConnections: wss?.clients?.size || 0,
      timestamp: Date.now(),
    };

    return res.status(200).json(response);
  } catch {
    return res.status(500).json({ error: "Failed to get WebSocket stats" });
  }
});

/**
 * Get recent WebSocket events (last N)
 */
router.get("/events", (req: Request, res: Response) => {
  try {
    // eslint-disable-next-line no-restricted-syntax
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);

    const events = getRecentEvents(limit);

    return res.status(200).json({
      events,
      count: events.length,
      timestamp: Date.now(),
    });
  } catch {
    return res.status(500).json({ error: "Failed to get WebSocket events" });
  }
});

/**
 * Get active connection count
 */
router.get("/connections", (_req: Request, res: Response) => {
  try {
    const wss = _req.app.locals.wss;
    const connections = wss?.clients?.size || 0;

    return res.status(200).json({
      activeConnections: connections,
      timestamp: Date.now(),
    });
  } catch {
    return res.status(500).json({ error: "Failed to get connection count" });
  }
});

export default router;
