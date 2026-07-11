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
router.use("/api/cover-art", coverArtUpload.single("file"), coverArtRouter);
router.use("/api/artists", artistsRouter);
router.use("/api/songs", songsRouter);
router.use("/api/albums", albumsRouter);
router.use("/api/playlists", playlistsRouter);
router.use("/api/search", searchRouter);
router.use("/api/analytics", analyticsRouter);
router.use("/api/admin/analytics", adminAnalyticsRouter);
router.use("/api/admin/websocket", adminWebSocketRouter);

export default router;
