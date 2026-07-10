import { Router } from "express";
import { z } from "zod";
import { validateRequest } from "../middleware/validateRequest";
import { requireAuth } from "../middleware/requireAuth";
import { db } from "../db";
import { coverArt } from "../db/schema";
import {
  processCoverArtImage,
  calculatefileHash,
  validateFileSize,
  getThumbnailPath,
} from "../lib/imageProcessor";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { readFileSync, existsSync } from "fs";

const router = Router();

const uploadDir = process.env.COVER_ART_UPLOAD_DIR ?? "/data/cover-art";

const coverArtUploadSchema = z.object({
  // The file will be handled via multipart/form-data, validated in middleware
});

router.use(requireAuth);

/**
 * POST /api/cover-art
 * Upload a new cover art image
 * - Validates max file size (20 MB)
 * - Calculates content hash and rejects duplicates
 * - Generates 128x128 and 1024x1024 thumbnails
 */
router.post("/cover-art", validateRequest(coverArtUploadSchema), async (req, res) => {
  const file = req.file;

  if (!file?.buffer) {
    return res.status(400).json({ error: "No file provided" });
  }

  const buffer = file.buffer;

  try {
    // Validate file size
    validateFileSize(buffer.length);

    // Calculate hash and check for duplicates
    const fileHash = calculatefileHash(buffer);

    const existingCoverArt = await db
      .select()
      .from(coverArt)
      .where(eq(coverArt.fileHash, fileHash))
      .limit(1);

    // If hash exists, return the existing entry
    if (existingCoverArt.length > 0) {
      const existing = existingCoverArt[0];
      return res.status(201).json({
        id: existing.id,
        filePath: existing.filePath,
        width: existing.width,
        height: existing.height,
        fileExtension: existing.fileExtension,
        fileSizeBytes: Number(existing.fileSizeBytes),
        fileHash: existing.fileHash,
        createdAt: existing.createdAt,
      });
    }

    // Process image (save original + generate thumbnails)
    const coverArtId = randomUUID();
    const processedImage = await processCoverArtImage(buffer, coverArtId, uploadDir);

    // Insert into database
    const [created] = await db
      .insert(coverArt)
      .values({
        id: coverArtId,
        filePath: processedImage.filePath,
        width: processedImage.width,
        height: processedImage.height,
        fileExtension: processedImage.fileExtension,
        fileSizeBytes: BigInt(processedImage.fileSizeBytes),
        fileHash: processedImage.fileHash,
      })
      .returning();

    return res.status(201).json({
      id: created.id,
      filePath: created.filePath,
      width: created.width,
      height: created.height,
      fileExtension: created.fileExtension,
      fileSizeBytes: Number(created.fileSizeBytes),
      fileHash: created.fileHash,
      createdAt: created.createdAt,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "FILE_TOO_LARGE") {
      return res.status(413).json({ error: "File exceeds 20 MB limit" });
    }
    if (error instanceof Error && error.message === "INVALID_IMAGE") {
      return res.status(400).json({ error: "Invalid image file" });
    }
    throw error;
  }
});

/**
 * GET /cover-art/:id/thumbnail/:size
 * Serve a thumbnail image for a cover art
 */
router.get("/cover-art/:id/thumbnail/:size", async (req, res) => {
  const { id, size } = req.params;
  const sizeNum = parseInt(size, 10);

  if (![128, 1024].includes(sizeNum)) {
    return res.status(400).json({ error: "Invalid thumbnail size" });
  }

  // Verify cover art exists
  const coverArtRecord = await db.select().from(coverArt).where(eq(coverArt.id, id)).limit(1);

  if (!coverArtRecord[0]) {
    return res.status(404).json({ error: "Cover art not found" });
  }

  // eslint-disable-next-line no-restricted-syntax
  const thumbnailPath = getThumbnailPath(id, sizeNum as 128 | 1024, uploadDir);

  if (!existsSync(thumbnailPath)) {
    return res.status(404).json({ error: "Thumbnail not found" });
  }

  const imageBuffer = readFileSync(thumbnailPath);
  res.contentType("image/jpeg").send(imageBuffer);
});

export default router;
