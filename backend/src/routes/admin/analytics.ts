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

router.post("/flush", async (_req, res) => {
  await deleteAllListeningAnalytics();
  return res.status(200).json({ ok: true });
});

router.post("/prune", validateRequest(pruneAnalyticsSchema), async (req, res) => {
  const { retentionDays } = pruneAnalyticsSchema.parse(req.body);

  await pruneListeningAnalyticsOlderThanDays(retentionDays);
  return res.status(200).json({ ok: true });
});

export default router;
