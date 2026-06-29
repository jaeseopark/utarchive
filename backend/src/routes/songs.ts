import { Router } from "express";
import { z } from "zod";
import { validateRequest } from "../middleware/validateRequest";
import { requireAuth, AuthenticatedRequest } from "../middleware/requireAuth";
import {
  createSong,
  resolveSongCoverArtId,
  selectSongById,
  selectSongTree,
  selectSongs,
  updateSongById,
  updateSongTags,
  selectUniqueTags,
} from "../db/queries/songs";

const router = Router();

const isoDateString = z
  .string()
  .datetime({ offset: true })
  .or(z.string().datetime({ offset: false }))
  .optional();

const songCreateSchema = z.object({
  title: z.string().min(1).max(500),
  parentId: z.string().uuid().nullable().optional(),
  platformId: z.string().max(200).nullable().optional(),
  releasedAt: isoDateString,
  artistIds: z.array(z.string().uuid()).min(1),
  url: z.string().max(2000).nullable().optional(),
  filePath: z.string().max(2000).nullable().optional(),
  coverArtId: z.string().uuid().nullable().optional(),
  description: z.string().optional(),
  preferred: z.boolean().optional(),
  trimRange: z.string().nullable().optional(),
  fileHash: z.string().max(64).nullable().optional(),
  tags: z.array(z.string()).optional(),
});

const songUpdateSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  parentId: z.never().optional(),
  masterId: z.never().optional(),
  platformId: z.string().max(200).nullable().optional(),
  releasedAt: isoDateString,
  artistIds: z.array(z.string().uuid()).min(1).optional(),
  url: z.string().max(2000).nullable().optional(),
  filePath: z.string().max(2000).nullable().optional(),
  coverArtId: z.string().uuid().nullable().optional(),
  description: z.string().optional(),
  preferred: z.boolean().optional(),
  trimRange: z.string().nullable().optional(),
  fileHash: z.string().max(64).nullable().optional(),
  tags: z.array(z.string()).optional(),
});

const songListSchema = z.object({
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
  artistId: z.string().uuid().optional(),
  masterId: z.string().uuid().optional(),
  preferred: z
    .preprocess((value) => {
      if (value === "true") return true;
      if (value === "false") return false;
      return undefined;
    }, z.boolean().optional()),
});

router.use(requireAuth);

router.get(
  "/api/songs",
  validateRequest(songListSchema, "query"),
  async (req, res) => {
    const { limit, offset, artistId, masterId, preferred } = req.query as unknown as z.infer<
      typeof songListSchema
    >;

    const songs = await selectSongs({
      limit,
      offset,
      artistId,
      masterId,
      preferred,
    });

    return res.status(200).json(songs);
  }
);

router.post(
  "/api/songs",
  validateRequest(songCreateSchema),
  async (req, res) => {
    const songData = req.body as z.infer<typeof songCreateSchema>;
    const artistIds = songData.artistIds;

    try {
      const createdSong = await createSong(songData, artistIds);
      return res.status(201).json(createdSong);
    } catch (error) {
      if (error instanceof Error && error.message === "PARENT_NOT_FOUND") {
        return res.status(400).json({ error: "Parent song not found" });
      }

      throw error;
    }
  }
);

router.get("/api/songs/:id", async (req, res) => {
  const song = await selectSongById(req.params.id);

  if (!song) {
    return res.status(404).json({ error: "Song not found" });
  }

  // Resolve cover art with fallback logic
  const resolvedCoverArtId = await resolveSongCoverArtId(req.params.id);

  return res.status(200).json({
    ...song,
    coverArtId: resolvedCoverArtId,
  });
});

router.patch(
  "/api/songs/:id",
  validateRequest(songUpdateSchema),
  async (req, res) => {
    const updateData = req.body as z.infer<typeof songUpdateSchema>;
    const songId = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: "No update fields provided" });
    }

    const updatedSong = await updateSongById(songId, updateData);

    if (!updatedSong) {
      return res.status(404).json({ error: "Song not found" });
    }

    return res.status(200).json(updatedSong);
  }
);

router.get("/api/songs/:id/tree", async (req, res) => {
  const songTree = await selectSongTree(req.params.id);

  if (!songTree) {
    return res.status(404).json({ error: "Song not found" });
  }

  return res.status(200).json(songTree);
});

const tagsUpdateSchema = z.object({
  tags: z.array(z.string()).optional(),
});

router.patch(
  "/api/songs/:id/tags",
  validateRequest(tagsUpdateSchema),
  async (req, res) => {
    const { tags } = req.body as z.infer<typeof tagsUpdateSchema>;
    const songId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    const updatedSong = await updateSongTags(songId, tags ?? []);

    if (!updatedSong) {
      return res.status(404).json({ error: "Song not found" });
    }

    return res.status(200).json({
      id: updatedSong.id,
      tags: updatedSong.tags,
    });
  }
);

router.get("/api/tags", async (_req, res) => {
  const tags = await selectUniqueTags();
  return res.status(200).json(tags);
});


export default router;
