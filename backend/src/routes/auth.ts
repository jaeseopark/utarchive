import { Router } from "express";
import { z } from "zod";
import { validateRequest } from "../middleware/validateRequest";
import { parseAuthCredentials, timingSafeEqual } from "../lib/auth";
import { validateTotp } from "../lib/totp";
import { signJwt } from "../lib/jwt";
import { requireAuth, AuthenticatedRequest } from "../middleware/requireAuth";
import { config } from "../config";

const router = Router();

const loginSchema = z.object({
  id: z.string().min(1),
  password: z.string().min(1),
  totpCode: z.string().min(1),
});

router.post("/login", validateRequest(loginSchema), (req, res) => {
  const { id, password, totpCode } = req.body;
  const { id: expectedId, password: expectedPassword, totpKey } =
    parseAuthCredentials(config.AUTH_CREDENTIALS);

  const idMatches = timingSafeEqual(id, expectedId);
  const passwordMatches = timingSafeEqual(password, expectedPassword);
  const totpMatches = validateTotp(totpKey, totpCode);

  if (!idMatches || !passwordMatches || !totpMatches) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = signJwt({ sub: id }, config.JWT_TTL_SECONDS);

  res.cookie("session", token, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    maxAge: config.JWT_TTL_SECONDS * 1000,
    path: "/",
  });

  return res.status(200).json({ id });
});

router.use(requireAuth);

router.post("/logout", (_req, res) => {
  res.clearCookie("session", {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
  });

  return res.status(200).json({ ok: true });
});

router.get(
  "/me",
  (req: AuthenticatedRequest, res) => {
    return res.status(200).json({ id: req.user?.sub });
  }
);

export default router;
