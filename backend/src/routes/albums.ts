import { Router } from "express";
import { z } from "zod";
import { validateRequest } from "../middleware/validateRequest";
import { requireAuth } from "../middleware/requireAuth";
import {
  AlbumCreateInput,
  AlbumUpdateInput,
  createAlbum,
  deleteAlbumSong,
  selectAlbumById,
  selectAlbums,
  upsertAlbumSong,
  updateAlbumById,
} from "../db/queries/albums";
import { broadcastMessage } from "../ws";
import { DataChangedMessage } from "../types/websocket";

const router = Router();

const albumTrackSchema = z.object({
  number: z.number().int().min(1),
  title: z.string().min(1).max(500),
});

const albumCreateSchema = z.object({
  title: z.string().min(1).max(500),
  artistIds: z.array(z.string().uuid()).min(1),
  yearReleased: z.number().int().optional(),
  coverArtId: z.string().uuid().nullable().optional(),
  trackList: z.array(albumTrackSchema).optional(),
  urls: z.record(z.string(), z.string()).optional(),
});

const albumUpdateSchema = albumCreateSchema.partial();

const listAlbumsQuerySchema = z.object({
  limit: z.preprocess((value) => {
    if (typeof value === "string" && value.length > 0) {
      return Number(value);
    }
    return undefined;
  }, z.number().int().min(1).max(200).default(50)),
  offset: z.preprocess((value) => {
    if (typeof value === "string" && value.length > 0) {
      return Number(value);
    }
    return undefined;
  }, z.number().int().min(0).default(0)),
});

const albumSongSchema = z.object({
  trackNumber: z.number().int().min(1),
});

router.use(requireAuth);

router.get("/albums", validateRequest(listAlbumsQuerySchema, "query"), async (req, res) => {
  // eslint-disable-next-line no-restricted-syntax
  const { limit, offset } = req.query as unknown as z.infer<typeof listAlbumsQuerySchema>;
  const albums = await selectAlbums(limit, offset);
  return res.status(200).json({ albums });
});

router.post("/albums", validateRequest(albumCreateSchema), async (req, res) => {
  // eslint-disable-next-line no-restricted-syntax
  const albumData = req.body as AlbumCreateInput;
  const requestId = req.requestId;

  const createdAlbum = await createAlbum(albumData);

  // Broadcast to all connected clients
  const wss = req.app.locals.wss;
  if (wss) {
    const message: DataChangedMessage = {
      type: "DATA_CHANGED",
      entity: "album",
      timestamp: Date.now(),
      data: {
        created: [createdAlbum],
      },
      requestId,
    };
    broadcastMessage(wss, message);
  }

  return res.status(201).json(createdAlbum);
});

router.get("/albums/:id", async (req, res) => {
  const album = await selectAlbumById(req.params.id);

  if (!album) {
    return res.status(404).json({ error: "Album not found" });
  }

  return res.status(200).json(album);
});

router.patch("/albums/:id", validateRequest(albumUpdateSchema), async (req, res) => {
  // eslint-disable-next-line no-restricted-syntax
  const updateData = req.body as AlbumUpdateInput;
  const albumId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const requestId = req.requestId;

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ error: "No update fields provided" });
  }

  const updatedAlbum = await updateAlbumById(albumId, updateData);

  if (!updatedAlbum) {
    return res.status(404).json({ error: "Album not found" });
  }

  // Broadcast to all connected clients
  const wss = req.app.locals.wss;
  if (wss) {
    const message: DataChangedMessage = {
      type: "DATA_CHANGED",
      entity: "album",
      timestamp: Date.now(),
      data: {
        updated: [updatedAlbum],
      },
      requestId,
    };
    broadcastMessage(wss, message);
  }

  return res.status(200).json(updatedAlbum);
});

router.put("/albums/:id/songs/:songId", validateRequest(albumSongSchema), async (req, res) => {
  // eslint-disable-next-line no-restricted-syntax
  const trackNumber = req.body.trackNumber as number;
  const albumId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const songId = Array.isArray(req.params.songId) ? req.params.songId[0] : req.params.songId;

  try {
    const association = await upsertAlbumSong(albumId, songId, trackNumber);
    return res.status(200).json(association);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "ALBUM_NOT_FOUND") {
        return res.status(404).json({ error: "Album not found" });
      }

      if (error.message === "SONG_NOT_FOUND") {
        return res.status(404).json({ error: "Song not found" });
      }
    }

    throw error;
  }
});

router.delete("/albums/:id/songs/:songId", async (req, res) => {
  const albumId = req.params.id;
  const songId = req.params.songId;
  const deleted = await deleteAlbumSong(albumId, songId);

  if (!deleted) {
    return res.status(404).json({ error: "Album association not found" });
  }

  return res.status(200).json({ ok: true });
});

export default router;
