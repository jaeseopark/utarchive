import { Router } from "express";
import { z } from "zod";
import { db } from "../db";
import { globals } from "../db/schema";
import { eq } from "drizzle-orm";
import { requireAuth, AuthenticatedRequest } from "../middleware/requireAuth";
import { validateRequest } from "../middleware/validateRequest";

const router = Router();

// Zod schema for user config updates - accepts any object structure
const updateConfigSchema = z.object({
  config: z.record(z.string(), z.unknown()).optional(),
});

router.use(requireAuth);

/**
 * GET /api/user/config
 * Fetch the current user's configuration object
 */
router.get("/config", async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const user = await db.query.globals.findFirst({
      where: eq(globals.id, userId),
    });

    if (!user) {
      // If user doesn't exist in the globals table, create an entry with default config
      await db.insert(globals).values({
        id: userId,
        config: {},
      });

      return res.json({ config: {} });
    }

    res.json({ config: user.config });
  } catch (error) {
    console.error("Error fetching user config:", error);
    res.status(500).json({ error: "Failed to fetch user config" });
  }
});

/**
 * PUT /api/user/config
 * Update the current user's configuration object
 * The config object is merged with the existing config (not replaced)
 */
router.put(
  "/config",
  validateRequest(updateConfigSchema),
  async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.sub;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // After validateRequest middleware, req.body is guaranteed to match updateConfigSchema
      const body = req.body;
      if (!("config" in body) || !body.config) {
        return res.status(400).json({ error: "config field is required" });
      }

      const newConfig = body.config;

      // Ensure user exists, then merge the new config with existing
      const user = await db.query.globals.findFirst({
        where: eq(globals.id, userId),
      });

      const mergedConfig = {
        ...(user?.config ?? {}),
        ...newConfig,
      };

      if (!user) {
        // Create new user entry
        await db.insert(globals).values({
          id: userId,
          config: mergedConfig,
        });
      } else {
        // Update existing user entry
        await db
          .update(globals)
          .set({
            config: mergedConfig,
            updatedAt: new Date(),
          })
          .where(eq(globals.id, userId));
      }

      res.json({ config: mergedConfig });
    } catch (error) {
      console.error("Error updating user config:", error);
      res.status(500).json({ error: "Failed to update user config" });
    }
  },
);

export default router;
