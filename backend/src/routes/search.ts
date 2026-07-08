import { Router } from "express";
import { z } from "zod";
import { validateRequest } from "../middleware/validateRequest";
import { requireAuth } from "../middleware/requireAuth";
import { searchEntities } from "../db/queries/search";

const router = Router();

const searchSchema = z.object({
  q: z.string().min(1),
});

router.use(requireAuth);

router.get(
  "/api/search",
  validateRequest(searchSchema, "query"),
  async (req, res) => {
    // eslint-disable-next-line no-restricted-syntax
    const { q } = req.query as unknown as z.infer<typeof searchSchema>;
    const results = await searchEntities(q);
    return res.status(200).json(results);
  }
);

export default router;
