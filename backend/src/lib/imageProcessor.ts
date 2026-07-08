import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import sharp from 'sharp';
import { createHash } from 'crypto';

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB
// eslint-disable-next-line no-restricted-syntax
const THUMBNAIL_SIZES = [128, 1024] as const;

export type ThumbnailSize = (typeof THUMBNAIL_SIZES)[number];

export type ProcessedImage = {
  id: string;
  filePath: string;
  width: number;
  height: number;
  fileExtension: string;
  fileSizeBytes: number;
  fileHash: string;
};

export type ThumbnailPaths = {
  [key in ThumbnailSize]: string;
};

/**
 * Calculate SHA-256 hash of file content
 */
export const calculatefileHash = (buffer: Buffer): string => {
  return createHash('sha256').update(buffer).digest('hex');
};

/**
 * Validate file size is within the 20 MB limit
 */
export const validateFileSize = (fileSize: number): void => {
  if (fileSize > MAX_FILE_SIZE_BYTES) {
    throw new Error('FILE_TOO_LARGE');
  }
};

/**
 * Get image metadata (width, height, format) from buffer
 */
export const getImageMetadata = async (buffer: Buffer): Promise<{
  width: number;
  height: number;
  format: string;
}> => {
  const metadata = await sharp(buffer).metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error('INVALID_IMAGE');
  }
  return {
    width: metadata.width,
    height: metadata.height,
    format: metadata.format ?? 'jpeg',
  };
};

/**
 * Generate thumbnails for the given image buffer
 * Creates both 128x128 and 1024x1024 thumbnails with upscaling if needed
 */
export const generateThumbnails = async (
  buffer: Buffer,
  coverArtId: string,
  outputDir: string
): Promise<ThumbnailPaths> => {
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const thumbnails: ThumbnailPaths = {
    128: '',
    1024: '',
  };

  for (const size of THUMBNAIL_SIZES) {
    const thumbnailPath = join(outputDir, `${coverArtId}_thumbnail_${size}.jpg`);
    await sharp(buffer)
      .resize(size, size, { fit: 'cover' })
      .jpeg({ quality: 85 })
      .toFile(thumbnailPath);
    thumbnails[size] = thumbnailPath;
  }

  return thumbnails;
};

/**
 * Process an uploaded cover art image
 * Validates size, calculates hash, saves original and generates thumbnails
 */
export const processCoverArtImage = async (
  buffer: Buffer,
  coverArtId: string,
  uploadDir: string
): Promise<ProcessedImage> => {
  validateFileSize(buffer.length);

  const fileHash = calculatefileHash(buffer);
  const { width, height, format } = await getImageMetadata(buffer);

  // Save original file
  const originalPath = join(uploadDir, `${coverArtId}.${format}`);
  writeFileSync(originalPath, buffer);

  // Generate thumbnails
  await generateThumbnails(buffer, coverArtId, uploadDir);

  return {
    id: coverArtId,
    filePath: originalPath,
    width,
    height,
    fileExtension: format,
    fileSizeBytes: buffer.length,
    fileHash,
  };
};

/**
 * Get the thumbnail path for a given cover art ID and size
 */
export const getThumbnailPath = (
  coverArtId: string,
  size: ThumbnailSize,
  uploadDir: string
): string => {
  return join(uploadDir, `${coverArtId}_thumbnail_${size}.jpg`);
};