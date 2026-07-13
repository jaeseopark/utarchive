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
import { broadcastMessage } from "../ws";
import { DataChangedMessage } from "../types/websocket";
import { serializeForApiResponse } from "../lib/serialization";

const router = Router();

const artistCreateSchema = z.object({
  name: z.string().min(1).max(255),
  aliases: z.array(z.string()).optional(),
  description: z.string().optional(),
  urls: z.array(z.string()).optional(),
});

const artistUpdateSchema = artistCreateSchema.partial();

const paginationSchema = z.object({
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

router.use(requireAuth);

router.get("/", validateRequest(paginationSchema, "query"), async (req, res) => {
  const { limit, offset } = paginationSchema.parse(req.query);
  const artists = await selectArtists(limit, offset);
  return res.status(200).json({ artists: serializeForApiResponse(artists) });
});

router.post("/", validateRequest(artistCreateSchema), async (req, res) => {
  const artist = artistCreateSchema.parse(req.body);
  const requestId = req.requestId;

  const [createdArtist] = await insertArtist(artist);

  // Broadcast to all connected clients
  const wss = req.app.locals.wss;
  if (wss) {
    const message: DataChangedMessage = {
      type: "DATA_CHANGED",
      entity: "artist",
      timestamp: Date.now(),
      data: {
        // eslint-disable-next-line no-restricted-syntax
        created: [serializeForApiResponse(createdArtist) as Record<string, unknown>],
      },
      requestId,
    };
    broadcastMessage(wss, message);
  }

  return res.status(201).json(serializeForApiResponse(createdArtist));
});

router.get("/:id", async (req, res) => {
  const artist = await selectArtistById(req.params.id);

  if (!artist) {
    return res.status(404).json({ error: "Artist not found" });
  }

  return res.status(200).json(serializeForApiResponse(artist));
});

router.patch("/:id", validateRequest(artistUpdateSchema), async (req, res) => {
  const updateData = artistUpdateSchema.parse(req.body);
  const artistId = String(req.params.id);
  const requestId = req.requestId;

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ error: "No update fields provided" });
  }

  const updatedRows = await updateArtistById(artistId, updateData);

  if (updatedRows.length === 0) {
    return res.status(404).json({ error: "Artist not found" });
  }

  // Broadcast to all connected clients
  const wss = req.app.locals.wss;
  if (wss) {
    const message: DataChangedMessage = {
      type: "DATA_CHANGED",
      entity: "artist",
      timestamp: Date.now(),
      data: {
        // eslint-disable-next-line no-restricted-syntax
        updated: [serializeForApiResponse(updatedRows[0]) as Record<string, unknown>],
      },
      requestId,
    };
    broadcastMessage(wss, message);
  }

  return res.status(200).json(serializeForApiResponse(updatedRows[0]));
});

router.get("/:id/songs", async (req, res) => {
  const artist = await selectArtistById(req.params.id);

  if (!artist) {
    return res.status(404).json({ error: "Artist not found" });
  }

  const songsData = await selectSongsByArtistId(req.params.id);
  // Return only song IDs; frontend will combine with zustand's song store
  const songIds = songsData.map((song) => song.id);
  return res.status(200).json({ songIds });
});

export default router;
