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

router.use(healthRouter);
router.use("/auth", authRouter);
router.use(upload.single("file"), coverArtRouter);
router.use(artistsRouter);
router.use(songsRouter);
router.use(albumsRouter);
router.use(playlistsRouter);
router.use(searchRouter);
router.use(analyticsRouter);
router.use(adminAnalyticsRouter);

export default router;
