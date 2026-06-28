import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth";
import {
  countListeningAnalytics,
  deleteAllListeningAnalytics,
  pruneListeningAnalyticsOlderThanDays,
} from "../../db/queries/analytics";

const router = Router();

router.use(requireAuth);

router.get("/api/admin/analytics/stats", async (_req, res) => {
  const count = await countListeningAnalytics();
  const retentionDays = Number(process.env.ANALYTICS_RETENTION_DAYS ?? "");

  return res.status(200).json({
    totalRecords: count,
    retentionDays: Number.isFinite(retentionDays) ? retentionDays : null,
  });
});

router.post("/api/admin/analytics/flush", async (_req, res) => {
  await deleteAllListeningAnalytics();
  return res.status(200).json({ ok: true });
});

router.post("/api/admin/analytics/prune", async (_req, res) => {
  const retentionDays = Number(process.env.ANALYTICS_RETENTION_DAYS ?? "");

  if (!Number.isFinite(retentionDays) || retentionDays <= 0) {
    return res.status(400).json({
      error: "ANALYTICS_RETENTION_DAYS must be configured as a positive integer",
    });
  }

  await pruneListeningAnalyticsOlderThanDays(retentionDays);
  return res.status(200).json({ ok: true });
});

export default router;
