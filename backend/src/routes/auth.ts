import { Router } from "express";
import { z } from "zod";
import { db } from "../db";
import { totpKeys } from "../db/schema";
import { eq } from "drizzle-orm";
import { validateRequest } from "../middleware/validateRequest";
import {
  parseAuthCredentials,
  timingSafeEqual,
  deriveTotpSecretFromPassphrase,
  hashTotpKey,
} from "../lib/auth";
import { validateTotp, generateTotpQrCode } from "../lib/totp";
import { signJwt } from "../lib/jwt";
import { requireAuth, AuthenticatedRequest } from "../middleware/requireAuth";
import { config } from "../config";

const router = Router();

const loginSchema = z.object({
  id: z.string().min(1),
  password: z.string().min(1),
});

const loginTotpSchema = z.object({
  id: z.string().min(1),
  totpCode: z.string().regex(/^\d{6}$/),
});

// Handle TOTP verification (both first-time setup and existing user verification)
const totpHandler = async (req: any, res: any) => {
  const { id, totpCode } = req.body;

  try {
    const { totpKey: totpKeyPhrase } = parseAuthCredentials(
      config.AUTH_CREDENTIALS
    );
    const derivedTotpSecret = deriveTotpSecretFromPassphrase(totpKeyPhrase);
    const currentTotpKeyHash = hashTotpKey(derivedTotpSecret);

    if (!validateTotp(derivedTotpSecret, totpCode)) {
      return res.status(401).json({ error: "Invalid TOTP code" });
    }

    // Check if user has TOTP registered
    const user = await db
      .select({ totpKeyHash: totpKeys.totpKeyHash })
      .from(totpKeys)
      .where(eq(totpKeys.id, id))
      .limit(1);

    if (user.length === 0 || !user[0]?.totpKeyHash) {
      // First-time setup: user doesn't exist yet, insert them
      await db
        .insert(totpKeys)
        .values({
          id,
          totpKeyHash: currentTotpKeyHash,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: totpKeys.id,
          set: {
            totpKeyHash: currentTotpKeyHash,
            updatedAt: new Date(),
          },
        });
    } else {
      // Existing user: verify key hasn't changed
      if (user[0].totpKeyHash !== currentTotpKeyHash) {
        return res.status(401).json({
          error: "TOTP key has changed. Please re-register.",
        });
      }
    }

    // Create session
    const token = signJwt({ sub: id }, config.JWT_TTL_SECONDS);

    res.cookie("session", token, {
      httpOnly: true,
      secure: config.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: config.JWT_TTL_SECONDS * 1000,
      path: "/",
    });

    return res.status(200).json({ id });
  } catch (error) {
    console.error("Error in login TOTP:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Validate credentials (id/password) and check if TOTP is registered
router.post("/login", validateRequest(loginSchema), async (req, res) => {
  const { id, password } = req.body;
  const { id: expectedId, password: expectedPassword, totpKey: totpKeyPhrase } =
    parseAuthCredentials(config.AUTH_CREDENTIALS);

  const idMatches = timingSafeEqual(id, expectedId);
  const passwordMatches = timingSafeEqual(password, expectedPassword);

  if (!idMatches || !passwordMatches) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  try {
    // Derive the TOTP secret from the passphrase (double hashing: SHA256 + Base32)
    const derivedTotpSecret = deriveTotpSecretFromPassphrase(totpKeyPhrase);
    const currentTotpKeyHash = hashTotpKey(derivedTotpSecret);

    // Check if user has TOTP registered for this specific key
    const user = await db
      .select({ totpKeyHash: totpKeys.totpKeyHash })
      .from(totpKeys)
      .where(eq(totpKeys.id, id))
      .limit(1);

    const isRegisteredForCurrentKey =
      user.length > 0 && user[0]?.totpKeyHash === currentTotpKeyHash;

    if (isRegisteredForCurrentKey) {
      // User has already set up TOTP for this key
      return res.status(200).json({ requiresTotpSetup: false });
    } else {
      // First time setup or key changed: generate QR code
      const qrCode = await generateTotpQrCode(derivedTotpSecret, id);

      return res.status(200).json({
        requiresTotpSetup: true,
        totpQrCode: qrCode,
        totpKeyHash: currentTotpKeyHash,
      });
    }
  } catch (error) {
    console.error("Error in login step 1:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Handle TOTP verification (both first-time setup and existing user verification)
router.post("/login/totp", validateRequest(loginTotpSchema), totpHandler);

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
