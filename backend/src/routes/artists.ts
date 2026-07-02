import { Router } from "express";
import { z } from "zod";
import { validateRequest } from "../middleware/validateRequest";
import { requireAuth } from "../middleware/requireAuth";
import {
  insertArtist,
  selectArtistById,
  selectArtists,
  selectSongsByArtistId,
  updateArtistById,
} from "../db/queries/artists";

const router = Router();

const artistCreateSchema = z.object({
  name: z.string().min(1).max(255),
  aliases: z.array(z.string()).optional(),
  description: z.string().optional(),
  urls: z.record(z.string(), z.string()).optional(),
});

const artistUpdateSchema = artistCreateSchema.partial();

const paginationSchema = z.object({
  limit: z
    .preprocess((value) => {
      if (typeof value === "string" && value.length > 0) {
        return Number(value);
      }
      return undefined;
    }, z.number().int().min(1).max(200).default(50)),
  offset: z
    .preprocess((value) => {
      if (typeof value === "string" && value.length > 0) {
        return Number(value);
      }
      return undefined;
    }, z.number().int().min(0).default(0)),
});

router.use(requireAuth);

router.get("/artists", validateRequest(paginationSchema, "query"), async (req, res) => {
  const { limit, offset } = req.query as unknown as {
    limit: number;
    offset: number;
  };
  const artists = await selectArtists(limit, offset);
  return res.status(200).json(artists);
});

router.post(
  "/artists",
  validateRequest(artistCreateSchema),
  async (req, res) => {
    const artist = req.body as z.infer<typeof artistCreateSchema>;
    const [createdArtist] = await insertArtist(artist);
    return res.status(201).json(createdArtist);
  }
);

router.get("/artists/:id", async (req, res) => {
  const artist = await selectArtistById(req.params.id);

  if (!artist) {
    return res.status(404).json({ error: "Artist not found" });
  }

  return res.status(200).json(artist);
});

router.patch(
  "/artists/:id",
  validateRequest(artistUpdateSchema),
  async (req, res) => {
    const updateData = req.body as z.infer<typeof artistUpdateSchema>;
    const artistId = String(req.params.id);

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: "No update fields provided" });
    }

    const updatedRows = await updateArtistById(artistId, updateData);

    if (updatedRows.length === 0) {
      return res.status(404).json({ error: "Artist not found" });
    }

    return res.status(200).json(updatedRows[0]);
  }
);

router.get("/artists/:id/songs", async (req, res) => {
  const artist = await selectArtistById(req.params.id);

  if (!artist) {
    return res.status(404).json({ error: "Artist not found" });
  }

  const songs = await selectSongsByArtistId(req.params.id);
  return res.status(200).json(songs);
});

export default router;
