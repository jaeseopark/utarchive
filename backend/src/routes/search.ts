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

router.get("/", validateRequest(searchSchema, "query"), async (req, res) => {
  const { q } = searchSchema.parse(req.query);
  const results = await searchEntities(q);
  return res.status(200).json(results);
});

export default router;
