import { Router } from "express";
import { z } from "zod";
import { validateRequest } from "../middleware/validateRequest";
import { requireAuth } from "../middleware/requireAuth";
import {
  addSongToPlaylist,
  deletePlaylistById,
  insertPlaylist,
  removeSongFromPlaylist,
  replacePlaylistSongs,
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

const playlistSongCreateSchema = z.object({
  songId: z.string().uuid(),
  position: z.number().int().min(0).optional(),
});

const playlistReplaceSongsSchema = z.object({
  songIds: z.array(z.string().uuid()),
});

router.use(requireAuth);

router.get("/playlists", validateRequest(listQuerySchema, "query"), async (req, res) => {
  // eslint-disable-next-line no-restricted-syntax
  const { limit, offset } = req.query as unknown as z.infer<typeof listQuerySchema>;
  const playlists = await selectPlaylists(limit, offset);
  return res.status(200).json(playlists);
});

router.post("/playlists", validateRequest(playlistCreateSchema), async (req, res) => {
  // eslint-disable-next-line no-restricted-syntax
  const { name } = req.body as z.infer<typeof playlistCreateSchema>;
  const playlist = await insertPlaylist(name);
  return res.status(201).json(playlist);
});

router.get("/playlists/:id", async (req, res) => {
  const playlistId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const playlist = await selectPlaylistById(playlistId);

  if (!playlist) {
    return res.status(404).json({ error: "Playlist not found" });
  }

  return res.status(200).json(playlist);
});

router.patch("/playlists/:id", validateRequest(playlistUpdateSchema), async (req, res) => {
  const playlistId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  // eslint-disable-next-line no-restricted-syntax
  const { name } = req.body as z.infer<typeof playlistUpdateSchema>;

  const updatedPlaylist = await updatePlaylistById(playlistId, name);

  if (!updatedPlaylist) {
    return res.status(404).json({ error: "Playlist not found" });
  }

  return res.status(200).json(updatedPlaylist);
});

router.delete("/playlists/:id", async (req, res) => {
  const playlistId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const deleted = await deletePlaylistById(playlistId);

  if (!deleted) {
    return res.status(404).json({ error: "Playlist not found" });
  }

  return res.status(200).json({ ok: true });
});

router.post("/playlists/:id/songs", validateRequest(playlistSongCreateSchema), async (req, res) => {
  const playlistId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  // eslint-disable-next-line no-restricted-syntax
  const { songId, position } = req.body as z.infer<typeof playlistSongCreateSchema>;

  try {
    const result = await addSongToPlaylist(playlistId, songId, position);
    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "PLAYLIST_NOT_FOUND") {
        return res.status(404).json({ error: "Playlist not found" });
      }
      if (error.message === "SONG_NOT_FOUND") {
        return res.status(404).json({ error: "Song not found" });
      }
      if (error.message === "INVALID_POSITION") {
        return res.status(400).json({ error: "Invalid position" });
      }
    }

    throw error;
  }
});

router.delete("/playlists/:id/songs/:songId", async (req, res) => {
  const playlistId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const songId = Array.isArray(req.params.songId) ? req.params.songId[0] : req.params.songId;

  const deleted = await removeSongFromPlaylist(playlistId, songId);

  if (!deleted) {
    return res.status(404).json({ error: "Playlist song not found" });
  }

  return res.status(200).json({ ok: true });
});

router.put(
  "/playlists/:id/songs",
  validateRequest(playlistReplaceSongsSchema),
  async (req, res) => {
    const playlistId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    // eslint-disable-next-line no-restricted-syntax
    const { songIds } = req.body as z.infer<typeof playlistReplaceSongsSchema>;

    try {
      const result = await replacePlaylistSongs(playlistId, songIds);
      return res.status(200).json(result);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "PLAYLIST_NOT_FOUND") {
          return res.status(404).json({ error: "Playlist not found" });
        }
        if (error.message === "INVALID_PLAYLIST_SONG_IDS") {
          return res
            .status(400)
            .json({ error: "songIds must contain the same songs currently in the playlist" });
        }
      }

      throw error;
    }
  },
);

export default router;
