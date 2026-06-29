import { Router } from "express";
import { z } from "zod";
import { validateRequest } from "../middleware/validateRequest";
import { requireAuth, AuthenticatedRequest } from "../middleware/requireAuth";
import { insertListeningAnalytics } from "../db/queries/analytics";

const router = Router();

const analyticsListenSchema = z.object({
  songId: z.string().uuid(),
  startedAt: z.string().datetime({ offset: true }).or(z.string().datetime({ offset: false })),
  durationSeconds: z.number().nonnegative(),
  playbackPercent: z.number().min(0).max(100),
  userAgent: z.string().max(2000).nullable().optional(),
});

router.use(requireAuth);

router.post(
  "/api/analytics/listen",
  validateRequest(analyticsListenSchema),
  async (req: AuthenticatedRequest, res) => {
    const payload = req.body as z.infer<typeof analyticsListenSchema>;

    await insertListeningAnalytics({
      songId: payload.songId,
      startedAt: payload.startedAt,
      durationSeconds: payload.durationSeconds,
      playbackPercent: payload.playbackPercent,
      userAgent: payload.userAgent ?? null,
    });

    return res.status(201).json({ ok: true });
  }
);

export default router;
