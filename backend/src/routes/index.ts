import { Router } from "express";
import multer from "multer";
import authRouter from "./auth";
import artistsRouter from "./artists";
import coverArtRouter from "./coverArt";
import healthRouter from "./health";
import songsRouter from "./songs";
import albumsRouter from "./albums";
import playlistsRouter from "./playlists";
import searchRouter from "./search";
import analyticsRouter from "./analytics";
import adminAnalyticsRouter from "./admin/analytics";
import adminWebSocketRouter from "./admin/websocket";

const router = Router();

// Configure multer for cover art uploads (20 MB limit)
const coverArtUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024, // 20 MB limit for cover art
  },
});

router.use("/api", healthRouter);
router.use("/api/auth", authRouter);
// ✅ CRITICAL FIX: Apply cover art multer ONLY to cover art routes, not to entire /api
// This prevents the 20 MB limit from blocking audio uploads (which have their own 100 MB limit)
router.use("/api/cover-art", coverArtUpload.single("file"), coverArtRouter);
router.use("/api", artistsRouter);
router.use("/api", songsRouter);
router.use("/api", albumsRouter);
router.use("/api", playlistsRouter);
router.use("/api", searchRouter);
router.use("/api", analyticsRouter);
router.use("/api", adminAnalyticsRouter);
router.use("/api", adminWebSocketRouter);

export default router;
