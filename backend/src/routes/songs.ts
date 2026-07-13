import { Router } from "express";
import { z } from "zod";
import { randomUUID } from "crypto";
import multer from "multer";
import { existsSync, statSync, createReadStream } from "fs";
import { validateRequest } from "../middleware/validateRequest";
import { requireAuth } from "../middleware/requireAuth";
import {
  createSong,
  resolveSongCoverArtId,
  selectSongById,
  selectSongTree,
  selectSongs,
  updateSongById,
  updateSongTags,
  selectUniqueTags,
  linkChildToParent,
} from "../db/queries/songs";
import { broadcastMessage } from "../ws";
import { DataChangedMessage } from "../types/websocket";
import { extractAudioMetadata, saveAudioFile } from "../lib/audioProcessor";
import { serializeForApiResponse } from "../lib/serialization";
import { db } from "../db";
import { eq } from "drizzle-orm";
import { songs } from "../db/schema";

const router = Router();

// Configure multer for audio uploads safely held in memory buffer
const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100 MB limit for large audio files
  },
});

const isoDateString = z
  .string()
  .datetime({ offset: true })
  .or(z.string().datetime({ offset: false }))
  .optional();

// ✅ SECURITY FIX: Removed filePath and fileHash from client-facing schema
// Server computes these safely using UUIDs and isolated directories
const songCreateSchema = z.object({
  title: z.string().min(1).max(500),
  parentId: z.string().uuid().nullable().optional(),
  releasedAt: isoDateString,
  artistIds: z.array(z.string().uuid()).min(1),
  urls: z.array(z.string()).optional(),
  coverArtId: z.string().uuid().nullable().optional(),
  description: z.string().optional(),
  playbackEnabled: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
});

// ✅ SECURITY FIX: Removed filePath and fileHash from client-facing schema
const songUpdateSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  parentId: z.never().optional(),
  masterId: z.never().optional(),
  releasedAt: isoDateString,
  artistIds: z.array(z.string().uuid()).min(1).optional(),
  urls: z.array(z.string()).optional(),
  coverArtId: z.string().uuid().nullable().optional(),
  description: z.string().optional(),
  playbackEnabled: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
});

const songListSchema = z.object({
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
  artistId: z.string().uuid().optional(),
  masterId: z.string().uuid().optional(),
  playbackEnabled: z.preprocess((value) => {
    if (value === "true") return true;
    if (value === "false") return false;
    return undefined;
  }, z.boolean().optional()),
});

router.use(requireAuth);

/**
 * GET /:id/audio
 * Serve audio file by ID with proper streaming headers
 * Supports range requests for seeking/scrubbing
 * File path retrieved from database song record
 */
router.get("/:id/audio", async (req, res, next) => {
  try {
    const songId = z.string().uuid().parse(req.params.id);

    // Query song to get file path from database
    const song = await selectSongById(songId);

    if (!song) {
      return res.status(404).json({ error: "Song not found" });
    }

    if (!song.filePath) {
      return res.status(404).json({ error: "Audio file not found" });
    }

    // Verify file exists on disk
    if (!existsSync(song.filePath)) {
      return res.status(404).json({ error: "Audio file not found on disk" });
    }

    // Determine content type from file extension
    const extension = song.filePath.split(".").pop()?.toLowerCase() || "mp3";
    const contentTypeMap: Record<string, string> = {
      mp3: "audio/mpeg",
      wav: "audio/wav",
      flac: "audio/flac",
      ogg: "audio/ogg",
      opus: "audio/opus",
      aac: "audio/aac",
      m4a: "audio/mp4",
    };

    const contentType = contentTypeMap[extension] || "audio/mpeg";
    const stat = statSync(song.filePath);
    const fileSize = stat.size;

    // Set required headers for audio streaming
    res.setHeader("Content-Type", contentType);
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Cache-Control", "public, max-age=3600");

    // Handle range requests (for seeking)
    const rangeHeader = req.headers.range;
    if (rangeHeader) {
      const parts = rangeHeader.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Content-Length": end - start + 1,
        "Content-Type": contentType,
        "Accept-Ranges": "bytes",
      });
      createReadStream(song.filePath, { start, end }).pipe(res);
      return;
    }

    // Standard full-file response
    res.setHeader("Content-Length", fileSize);
    createReadStream(song.filePath).pipe(res);
  } catch (err) {
    next(err);
  }
});

router.get("/", validateRequest(songListSchema, "query"), async (req, res, next) => {
  try {
    const { limit, offset, artistId, masterId, playbackEnabled } = songListSchema.parse(req.query);

    const songList = await selectSongs({
      limit,
      offset,
      artistId,
      masterId,
      playbackEnabled,
    });

    return res.status(200).json({ songs: serializeForApiResponse(songList) });
  } catch (err) {
    next(err);
  }
});

router.post("/", validateRequest(songCreateSchema), async (req, res, next) => {
  try {
    const songData = songCreateSchema.parse(req.body);
    const artistIds = songData.artistIds;
    const requestId = req.requestId;

    const createdSong = await createSong(songData, artistIds);

    // Broadcast to all connected clients
    const wss = req.app.locals.wss;
    if (wss) {
      const message: DataChangedMessage = {
        type: "DATA_CHANGED",
        entity: "song",
        timestamp: Date.now(),
        data: {
          // eslint-disable-next-line no-restricted-syntax
          created: [serializeForApiResponse(createdSong) as Record<string, unknown>],
        },
        requestId,
      };
      broadcastMessage(wss, message);
    }

    return res.status(201).json(serializeForApiResponse(createdSong));
  } catch (error) {
    if (error instanceof Error && error.message === "PARENT_NOT_FOUND") {
      return res.status(400).json({ error: "Parent song not found" });
    }

    // ✅ ERROR HANDLING FIX: Pass to next() instead of throwing
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    // ✅ PARAMETER VALIDATION FIX: Use Zod validation instead of Array.isArray
    const songId = z.string().uuid().parse(req.params.id);

    const song = await selectSongById(songId);

    if (!song) {
      return res.status(404).json({ error: "Song not found" });
    }

    // Resolve cover art with fallback logic
    const resolvedCoverArtId = await resolveSongCoverArtId(songId);

    return res.status(200).json(
      serializeForApiResponse({
        ...song,
        coverArtId: resolvedCoverArtId,
      }),
    );
  } catch (err) {
    next(err);
  }
});

router.patch("/:id", validateRequest(songUpdateSchema), async (req, res, next) => {
  try {
    const updateData = songUpdateSchema.parse(req.body);
    // ✅ PARAMETER VALIDATION FIX: Use Zod validation instead of Array.isArray
    const songId = z.string().uuid().parse(req.params.id);
    const requestId = req.requestId;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: "No update fields provided" });
    }

    const updatedSong = await updateSongById(songId, updateData);

    if (!updatedSong) {
      return res.status(404).json({ error: "Song not found" });
    }

    // Broadcast to all connected clients
    const wss = req.app.locals.wss;
    if (wss) {
      const message: DataChangedMessage = {
        type: "DATA_CHANGED",
        entity: "song",
        timestamp: Date.now(),
        data: {
          // eslint-disable-next-line no-restricted-syntax
          updated: [serializeForApiResponse(updatedSong) as Record<string, unknown>],
        },
        requestId,
      };
      broadcastMessage(wss, message);
    }

    return res.status(200).json(serializeForApiResponse(updatedSong));
  } catch (err) {
    next(err);
  }
});

router.get("/:id/tree", async (req, res, next) => {
  try {
    // ✅ PARAMETER VALIDATION FIX: Use Zod validation instead of Array.isArray
    const songId = z.string().uuid().parse(req.params.id);

    const songTree = await selectSongTree(songId);

    if (!songTree) {
      return res.status(404).json({ error: "Song not found" });
    }

    return res.status(200).json(songTree);
  } catch (err) {
    next(err);
  }
});

const linkChildSchema = z.object({
  childId: z.string().uuid(),
});

router.post("/:id/children", validateRequest(linkChildSchema), async (req, res, next) => {
  try {
    // ✅ PARAMETER VALIDATION FIX: Use Zod validation instead of Array.isArray
    const parentId = z.string().uuid().parse(req.params.id);
    const { childId } = linkChildSchema.parse(req.body);
    const requestId = req.requestId;

    const linkedChild = await linkChildToParent(childId, parentId);

    // Broadcast to all connected clients
    const wss = req.app.locals.wss;
    if (wss) {
      const message: DataChangedMessage = {
        type: "DATA_CHANGED",
        entity: "song",
        timestamp: Date.now(),
        data: {
          // eslint-disable-next-line no-restricted-syntax
          updated: [serializeForApiResponse(linkedChild) as Record<string, unknown>],
        },
        requestId,
      };
      broadcastMessage(wss, message);
    }

    return res.status(200).json(serializeForApiResponse(linkedChild));
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "CHILD_NOT_FOUND") {
        return res.status(404).json({ error: "Child song not found" });
      }
      if (error.message === "PARENT_NOT_FOUND") {
        return res.status(404).json({ error: "Parent song not found" });
      }
    }

    // ✅ ERROR HANDLING FIX: Pass to next() instead of throwing
    next(error);
  }
});

const tagsUpdateSchema = z.object({
  tags: z.array(z.string()).optional(),
});

router.patch("/:id/tags", validateRequest(tagsUpdateSchema), async (req, res, next) => {
  try {
    const { tags } = tagsUpdateSchema.parse(req.body);
    // ✅ PARAMETER VALIDATION FIX: Use Zod validation instead of Array.isArray
    const songId = z.string().uuid().parse(req.params.id);
    const requestId = req.requestId;

    const updatedSong = await updateSongTags(songId, tags ?? []);

    if (!updatedSong) {
      return res.status(404).json({ error: "Song not found" });
    }

    // Broadcast to all connected clients
    const wss = req.app.locals.wss;
    if (wss) {
      const message: DataChangedMessage = {
        type: "DATA_CHANGED",
        entity: "song",
        timestamp: Date.now(),
        data: {
          updated: [{ id: updatedSong.id, tags: updatedSong.tags }],
        },
        requestId,
      };
      broadcastMessage(wss, message);
    }

    return res.status(200).json({
      id: updatedSong.id,
      tags: updatedSong.tags,
    });
  } catch (err) {
    next(err);
  }
});

router.get("/tags", async (_req, res, next) => {
  try {
    const tags = await selectUniqueTags();
    return res.status(200).json({ tags });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /songs/:id/audio
 * Upload and save audio file for a song
 * - ✅ CRITICAL FIX: audioUpload.single("file") injected into route signature
 * - Checks song exists early (fail fast)
 * - Validates max file size (100 MB)
 * - Calculates content hash without saving to disk
 * - Returns 409 Conflict if duplicate audio file exists for another song
 * - Updates song with filePath, fileExtension, fileSizeBytes, fileHash, and duration
 * - Broadcasts websocket update to all clients
 *
 * ✅ PERFORMANCE FIX: All I/O operations (extractAudioMetadata, saveAudioFile) run
 * BEFORE database writes. This prevents locking rows in PostgreSQL during slow
 * I/O operations, which would block all other updates to that song.
 */
router.post("/:id/audio", audioUpload.single("file"), async (req, res, next) => {
  try {
    const file = req.file;
    // ✅ PARAMETER VALIDATION FIX: Use Zod validation instead of Array.isArray
    const songId = z.string().uuid().parse(req.params.id);
    const requestId = req.requestId;

    if (!file?.buffer) {
      return res.status(400).json({ error: "No audio file provided" });
    }

    // Check if song exists early (fail fast) - quick read operation
    const song = await selectSongById(songId);
    if (!song) {
      return res.status(404).json({ error: "Song not found" });
    }

    const {
      fileExtension,
      fileSizeBytes,
      fileHash: initialHash,
      duration,
    } = await extractAudioMetadata(file.buffer, file.originalname);

    // Check for duplicate audio file (same hash) - quick read operation
    const duplicateSong = await db
      .select()
      .from(songs)
      .where(eq(songs.fileHash, initialHash))
      .limit(1);

    // If duplicate found, return 409 Conflict with the existing song ID
    if (duplicateSong.length > 0) {
      return res.status(409).json({
        error: "Audio file already exists for another song",
        existingSongId: duplicateSong[0].id,
      });
    }

    // Save new file to disk (I/O-bound operation, happens before DB writes)
    const audioFileId = randomUUID();
    const uploadDir = process.env.AUDIO_UPLOAD_DIR ?? "/data/audio";
    const processedAudio = await saveAudioFile(file.buffer, audioFileId, uploadDir, {
      fileExtension,
      fileSizeBytes,
      fileHash: initialHash,
      duration,
    });

    const updateData = {
      filePath: processedAudio.filePath,
      fileExtension: processedAudio.fileExtension,
      fileSizeBytes: BigInt(processedAudio.fileSizeBytes),
      fileHash: processedAudio.fileHash,
      duration: processedAudio.duration,
      playbackEnabled: true,
    };

    const updatedSong = await updateSongById(songId, updateData);

    if (!updatedSong) {
      return res.status(404).json({ error: "Failed to update song" });
    }

    // Broadcast to all connected clients
    const wss = req.app.locals.wss;
    if (wss) {
      const message: DataChangedMessage = {
        type: "DATA_CHANGED",
        entity: "song",
        timestamp: Date.now(),
        data: {
          // eslint-disable-next-line no-restricted-syntax
          updated: [serializeForApiResponse(updatedSong) as Record<string, unknown>],
        },
        requestId,
      };
      broadcastMessage(wss, message);
    }

    return res.status(200).json(serializeForApiResponse(updatedSong));
  } catch (error) {
    if (error instanceof Error && error.message === "FILE_TOO_LARGE") {
      return res.status(413).json({ error: "File exceeds 100 MB limit" });
    }
    // ✅ ERROR HANDLING FIX: Pass to next() instead of throwing
    next(error);
  }
});

export default router;
