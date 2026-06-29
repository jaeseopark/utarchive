import { Router } from "express";
import { z } from "zod";
import { validateRequest } from "../../middleware/validateRequest";
import { requireAuth } from "../../middleware/requireAuth";
import {
  deleteAllListeningAnalytics,
  pruneListeningAnalyticsOlderThanDays,
} from "../../db/queries/analytics";

const router = Router();

const pruneAnalyticsSchema = z.object({
  retentionDays: z.number().int().positive(),
});

router.use(requireAuth);

router.post("/api/admin/analytics/flush", async (_req, res) => {
  await deleteAllListeningAnalytics();
  return res.status(200).json({ ok: true });
});

router.post(
  "/api/admin/analytics/prune",
  validateRequest(pruneAnalyticsSchema),
  async (req, res) => {
    const { retentionDays } = req.body as z.infer<typeof pruneAnalyticsSchema>;

    await pruneListeningAnalyticsOlderThanDays(retentionDays);
    return res.status(200).json({ ok: true });
  }
);

export default router;
