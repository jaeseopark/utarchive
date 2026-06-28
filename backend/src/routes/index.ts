import { Router } from "express";
import authRouter from "./auth";
import artistsRouter from "./artists";
import healthRouter from "./health";
import songsRouter from "./songs";
import albumsRouter from "./albums";
import playlistsRouter from "./playlists";
import searchRouter from "./search";
import analyticsRouter from "./analytics";
import adminAnalyticsRouter from "./admin/analytics";

const router = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use(artistsRouter);
router.use(songsRouter);
router.use(albumsRouter);
router.use(playlistsRouter);
router.use(searchRouter);
router.use(analyticsRouter);
router.use(adminAnalyticsRouter);

export default router;
