import { Router } from "express";
import authRouter from "./auth";
import artistsRouter from "./artists";
import healthRouter from "./health";
import songsRouter from "./songs";
import albumsRouter from "./albums";
import playlistsRouter from "./playlists";

const router = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use(artistsRouter);
router.use(songsRouter);
router.use(albumsRouter);
router.use(playlistsRouter);

export default router;
