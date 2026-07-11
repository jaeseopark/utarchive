import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { createHash } from "crypto";

const MAX_AUDIO_FILE_SIZE_BYTES = 500 * 1024 * 1024; // 500 MB for audio files

// Type for music-metadata result
interface AudioMetadataFormat {
  duration?: number;
  container?: string;
}

interface AudioMetadataResult {
  format: AudioMetadataFormat;
}

/**
 * Sanitize file extension to prevent path traversal and invalid characters.
 * Extracts only the last component after the final '/' or '\' to prevent
 * nested directory creation from malformed container strings like 'isom/iso2/mp41'.
 * Falls back to 'mp3' if extension is invalid.
 */
export const sanitizeFileExtension = (extension: string): string => {
  // Extract only the last component (after final / or \)
  const lastComponent = extension.split(/[/\\]/).pop() ?? extension;

  // Remove any non-alphanumeric characters except dots
  const cleaned = lastComponent.replace(/[^a-z0-9.]/gi, "");

  // If the result is empty or too long, fall back to mp3
  if (!cleaned || cleaned.length > 10) {
    return "mp3";
  }

  // Validate it looks like a real extension (not just dots)
  if (!/^[a-z0-9]{1,10}$/i.test(cleaned)) {
    return "mp3";
  }

  return cleaned.toLowerCase();
};

/**
 * Map technical format strings from music-metadata to standard audio extensions.
 * music-metadata returns detailed format info (e.g., 'mp41', 'isom', 'iso2')
 * which we convert back to user-friendly extensions (e.g., 'm4a').
 */
export const mapFormatToExtension = (format: string): string => {
  const lower = format.toLowerCase();

  // Map common format strings to standard extensions
  const formatMap: Record<string, string> = {
    // MPEG-4 Audio variants
    mp41: "m4a",
    isom: "m4a",
    iso2: "m4a",
    m4a: "m4a",
    // MPEG-4 Video (sometimes contains audio)
    mp42: "mp4",
    mp4: "mp4",
    // MP3
    mp3: "mp3",
    mpeg: "mp3",
    // WAV
    wav: "wav",
    wave: "wav",
    // FLAC
    flac: "flac",
    // AAC
    aac: "aac",
    adts: "aac",
    // Ogg Vorbis
    ogg: "ogg",
    vorbis: "ogg",
    // Opus
    opus: "opus",
  };

  return formatMap[lower] ?? "mp3";
};

export type AudioMetadata = {
  fileExtension: string;
  fileSizeBytes: number;
  fileHash: string;
  duration?: number;
};

export type ProcessedAudio = AudioMetadata & {
  filePath: string;
};

/**
 * Calculate SHA-256 hash of file content
 */
export const calculateAudioHash = (buffer: Buffer): string => {
  return createHash("sha256").update(buffer).digest("hex");
};

/**
 * Validate audio file size is within the limit
 */
export const validateAudioFileSize = (fileSize: number): void => {
  if (fileSize > MAX_AUDIO_FILE_SIZE_BYTES) {
    throw new Error("FILE_TOO_LARGE");
  }
};

/**
 * Get audio metadata (duration, format) from buffer
 * Falls back to simple extension-based detection if music-metadata is not available
 */
export const getAudioMetadata = async (
  buffer: Buffer,
  filename?: string,
): Promise<{
  duration?: number;
  format: string;
}> => {
  // Try to extract format from filename first (most reliable)
  let format = "mp3";

  if (filename) {
    const extension = filename.split(".").pop()?.toLowerCase();
    if (extension && /^(mp3|wav|flac|aac|ogg|m4a|wma|opus|mp4)$/.test(extension)) {
      format = extension;
    }
  }

  // Try to use music-metadata if available for better duration detection
  try {
    // Dynamically import music-metadata using import() instead of require()
    const mmModule = await import("music-metadata");

    // Type guard to check if parseBuffer function exists
    if (
      mmModule &&
      typeof mmModule === "object" &&
      "parseBuffer" in mmModule &&
      typeof mmModule.parseBuffer === "function"
    ) {
      // Add timeout protection to prevent hangs on corrupted audio files
      // Wrap parseBuffer in a race condition: whichever completes first wins
      const parsePromise = mmModule.parseBuffer(buffer);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Audio metadata parse timeout after 10 seconds")), 10000),
      );

      // Call parseBuffer and validate result structure
      const result = await Promise.race([parsePromise, timeoutPromise]);
      if (
        result &&
        typeof result === "object" &&
        "format" in result &&
        typeof result.format === "object"
      ) {
        // eslint-disable-next-line no-restricted-syntax
        const metadata = result as AudioMetadataResult;

        // If we already have a valid extension from filename, keep it
        // Otherwise, try to map the detected format to a standard extension
        if (!filename || !format || format === "mp3") {
          const detectedContainer = metadata.format.container ?? format;
          format = mapFormatToExtension(detectedContainer);
        }

        return {
          duration: metadata.format.duration ? metadata.format.duration * 1000 : undefined,
          format,
        };
      }
    }
  } catch {
    // music-metadata not available or failed to parse, continue with fallback
    // Log for debugging but don't fail - fallback should work
  }

  // Fallback: just return the detected format without duration
  return {
    duration: undefined,
    format,
  };
};

/**
 * Extract audio metadata and hash without saving to disk
 * Use this first to validate and check for duplicates before calling saveAudioFile()
 */
export const extractAudioMetadata = async (
  buffer: Buffer,
  originalFilename?: string,
): Promise<AudioMetadata> => {
  validateAudioFileSize(buffer.length);

  const fileHash = calculateAudioHash(buffer);
  const { duration, format } = await getAudioMetadata(buffer, originalFilename);

  // Sanitize extension to prevent path traversal and invalid characters
  const sanitizedExtension = sanitizeFileExtension(format);

  return {
    fileExtension: sanitizedExtension,
    fileSizeBytes: buffer.length,
    fileHash,
    duration,
  };
};

/**
 * Save audio file to disk (call only after duplicate check passes)
 */
export const saveAudioFile = async (
  buffer: Buffer,
  audioId: string,
  uploadDir: string,
  metadata: AudioMetadata,
): Promise<ProcessedAudio> => {
  // Ensure upload directory exists
  if (!existsSync(uploadDir)) {
    mkdirSync(uploadDir, { recursive: true });
  }

  // Save audio file
  const filePath = join(uploadDir, `${audioId}.${metadata.fileExtension}`);
  writeFileSync(filePath, buffer);

  return {
    filePath,
    ...metadata,
  };
};


