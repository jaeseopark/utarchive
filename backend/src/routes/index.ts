import { Router } from "express";
import authRouter from "./auth";
import artistsRouter from "./artists";
import healthRouter from "./health";
import songsRouter from "./songs";
import albumsRouter from "./albums";

const router = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use(artistsRouter);
router.use(songsRouter);
router.use(albumsRouter);

export default router;
