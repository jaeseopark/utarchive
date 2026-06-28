import { Router } from "express";
import authRouter from "./auth";
import healthRouter from "./health";

const router = Router();

router.use(healthRouter);
router.use("/auth", authRouter);

export default router;
