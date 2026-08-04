import { Router } from "express";
import { z } from "zod";
import { validateRequest } from "../middleware/validateRequest";
import { requireAuth } from "../middleware/requireAuth";
import { DataChangedMessage } from "../types/websocket";
import { broadcastMessage } from "../ws";
import {
  deletePlaylistById,
  insertPlaylist,
  removeSongFromPlaylist,
  upsertPlaylistSongs,
  selectPlaylistById,
  selectPlaylists,
  updatePlaylistById,
} from "../db/queries/playlists";

const router = Router();

const listQuerySchema = z.object({
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

const playlistCreateSchema = z.object({
  name: z.string().min(1).max(255),
});

const playlistUpdateSchema = z.object({
  name: z.string().min(1).max(255),
});

const playlistUpsertSongsSchema = z.object({
  songIds: z.array(z.string().uuid()).min(1),
  position: z.number().int().min(0).optional().default(100000),
});

router.use(requireAuth);

router.get("/", validateRequest(listQuerySchema, "query"), async (req, res) => {
  const { limit, offset } = listQuerySchema.parse(req.query);
  const playlists = await selectPlaylists(limit, offset);
  return res.status(200).json({ playlists });
});

router.post("/", validateRequest(playlistCreateSchema), async (req, res) => {
  const { name } = playlistCreateSchema.parse(req.body);
  const playlist = await insertPlaylist(name);
  return res.status(201).json(playlist);
});

router.get("/:id", async (req, res) => {
  const playlistId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const playlist = await selectPlaylistById(playlistId);

  if (!playlist) {
    return res.status(404).json({ error: "Playlist not found" });
  }

  return res.status(200).json(playlist);
});

router.patch("/:id", validateRequest(playlistUpdateSchema), async (req, res) => {
  const playlistId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { name } = playlistUpdateSchema.parse(req.body);

  const updatedPlaylist = await updatePlaylistById(playlistId, name);

  if (!updatedPlaylist) {
    return res.status(404).json({ error: "Playlist not found" });
  }

  return res.status(200).json(updatedPlaylist);
});

router.delete("/:id", async (req, res) => {
  const playlistId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const deleted = await deletePlaylistById(playlistId);

  if (!deleted) {
    return res.status(404).json({ error: "Playlist not found" });
  }

  return res.status(200).json({ ok: true });
});

router.delete("/:id/songs/:songId", async (req, res) => {
  const playlistId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const songId = Array.isArray(req.params.songId) ? req.params.songId[0] : req.params.songId;

  const deleted = await removeSongFromPlaylist(playlistId, songId);

  if (!deleted) {
    return res.status(404).json({ error: "Playlist song not found" });
  }

  return res.status(200).json({ ok: true });
});

/**
 * Upserts playlist song positions in the requested order.
 */
router.patch(
  "/:id/songs",
  validateRequest(playlistUpsertSongsSchema),
  async (req, res) => {
    const playlistId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { songIds, position } = playlistUpsertSongsSchema.parse(req.body);
    const requestId = req.requestId;

    try {
      const result = await upsertPlaylistSongs(playlistId, songIds, position);

      const updatedPlaylist = await selectPlaylistById(playlistId);
      const wss = req.app.locals.wss;

      if (wss && updatedPlaylist) {
        const message: DataChangedMessage = {
          type: "DATA_CHANGED",
          entity: "playlist",
          timestamp: Date.now(),
          data: {
            updated: [updatedPlaylist],
          },
          requestId,
        };
        broadcastMessage(wss, message);
      }

      return res.status(200).json(result);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "PLAYLIST_NOT_FOUND") {
          return res.status(404).json({ error: "Playlist not found" });
        }
        if (error.message === "INVALID_PLAYLIST_SONG_IDS") {
          return res.status(400).json({ error: "songIds must contain existing songs from the playlist" });
        }
      }

      throw error;
    }
  },
);

export default router;
