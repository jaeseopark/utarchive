import { Router } from "express";
import { z } from "zod";
import { requireAuth, AuthenticatedRequest } from "../middleware/requireAuth";
import { insertListeningAnalytics } from "../db/queries/analytics";

const router = Router();

const analyticsListenSchema = z.object({
  songId: z.string().uuid(),
  startedAt: z
    .string()
    .datetime({ offset: true })
    .or(z.string().datetime({ offset: false })),
  durationSeconds: z.number().nonnegative(),
  playbackPercent: z.number().min(0).max(100),
  userAgent: z.string().max(2000).nullable().optional(),
});

router.use(requireAuth);

router.post("/analytics/listen", async (req: AuthenticatedRequest, res) => {
  // Handle both JSON and text/plain (from sendBeacon) content types
  let body: unknown;
  if (typeof req.body === "string") {
    try {
      body = JSON.parse(req.body);
    } catch {
      return res.status(400).json({ error: "Invalid JSON" });
    }
  } else {
    body = req.body;
  }

  const result = analyticsListenSchema.safeParse(body);
  if (!result.success) {
    return res.status(400).json({ error: "Invalid request body" });
  }

  const payload = result.data;

  await insertListeningAnalytics({
    songId: payload.songId,
    startedAt: payload.startedAt,
    durationSeconds: payload.durationSeconds,
    playbackPercent: payload.playbackPercent,
    userAgent: payload.userAgent ?? null,
  });

  return res.status(201).json({ ok: true });
});

export default router;
