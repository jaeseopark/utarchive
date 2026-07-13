import { Router } from "express";
import { z } from "zod";
import { validateRequest } from "../middleware/validateRequest";
import { requireAuth } from "../middleware/requireAuth";
import {
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
  duration: z.number().min(0).optional(),
});

const albumCreateSchema = z.object({
  title: z.string().min(1).max(500),
  artistIds: z.array(z.string().uuid()).min(1),
  yearReleased: z.number().int().optional(),
  coverArtId: z.string().uuid().nullable().optional(),
  trackList: z.array(albumTrackSchema).optional(),
  urls: z.array(z.string()).optional(),
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

router.get("/", validateRequest(listAlbumsQuerySchema, "query"), async (req, res) => {
  const { limit, offset } = listAlbumsQuerySchema.parse(req.query);
  const albums = await selectAlbums(limit, offset);
  return res.status(200).json({ albums });
});

router.post("/", validateRequest(albumCreateSchema), async (req, res) => {
  const albumData = albumCreateSchema.parse(req.body);
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

router.get("/:id", async (req, res) => {
  const album = await selectAlbumById(req.params.id);

  if (!album) {
    return res.status(404).json({ error: "Album not found" });
  }

  return res.status(200).json(album);
});

router.patch("/:id", validateRequest(albumUpdateSchema), async (req, res) => {
  const updateData = albumUpdateSchema.parse(req.body);
  const albumId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const requestId = req.requestId;

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ error: "No update fields provided" });
  }

  await updateAlbumById(albumId, updateData);

  // Fetch the updated album with all associations and computed tracks
  const updatedAlbum = await selectAlbumById(albumId);

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

router.put("/:id/songs/:songId", validateRequest(albumSongSchema), async (req, res) => {
  const { trackNumber } = albumSongSchema.parse(req.body);
  const albumId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const songId = Array.isArray(req.params.songId) ? req.params.songId[0] : req.params.songId;
  const requestId = req.requestId;

  try {
    await upsertAlbumSong(albumId, songId, trackNumber);

    // Fetch updated album with all associations and computed tracks
    const updatedAlbum = await selectAlbumById(albumId);

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

router.delete("/:id/songs/:songId", async (req, res) => {
  const albumId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const songId = Array.isArray(req.params.songId) ? req.params.songId[0] : req.params.songId;
  const requestId = req.requestId;
  const deleted = await deleteAlbumSong(albumId, songId);

  if (!deleted) {
    return res.status(404).json({ error: "Album association not found" });
  }

  // Fetch updated album with all associations and computed tracks
  // Ideally we want to emit the minimal delta event, but too much work for now. we'll revisit later.
  const updatedAlbum = await selectAlbumById(albumId);

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

export default router;
