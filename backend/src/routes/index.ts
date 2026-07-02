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

const router = Router();

// Configure multer for cover art uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024, // 20 MB limit
  },
});

router.use("/api", healthRouter);
router.use("/api/auth", authRouter);
router.use("/api", upload.single("file"), coverArtRouter);
router.use("/api", artistsRouter);
router.use("/api", songsRouter);
router.use("/api", albumsRouter);
router.use("/api", playlistsRouter);
router.use("/api", searchRouter);
router.use("/api", analyticsRouter);
router.use("/api", adminAnalyticsRouter);

export default router;
