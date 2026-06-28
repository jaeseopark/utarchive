import { Router } from "express";
import authRouter from "./auth";
import artistsRouter from "./artists";
import healthRouter from "./health";

const router = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use(artistsRouter);

export default router;
