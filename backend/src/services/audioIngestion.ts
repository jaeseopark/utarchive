import { watch, FSWatcher } from "chokidar";
import { copyFileSync, readFileSync, statSync } from "fs";
import { basename, join } from "path";
import { randomUUID } from "crypto";
import { config } from "../config";
import { db } from "../db";
import { songs } from "../db/schema";
import { eq } from "drizzle-orm";
import {
  extractAudioMetadata,
  saveAudioFile,
  calculateAudioHash,
  ProcessedAudio,
} from "../lib/audioProcessor";
import { AuthenticatedWebSocket } from "../types/websocket";
import { WebSocketServer } from "ws";

interface IngestionStatus {
  filename: string;
  status: "success" | "skipped" | "error" | "timeout";
  songId?: string;
  hash?: string;
  duration?: number;
  error?: string;
  bytes?: number;
}

/**
 * Monitor file size for stability. Returns true when file size is unchanged
 * for 2 consecutive 500ms checks (2-second window).
 * Timeout after 30 seconds with warning log.
 */
async function waitForFileStability(
  filePath: string,
  maxWaitMs: number = 30000,
): Promise<boolean> {
  const pollIntervalMs = 500;
  const stableCheckCount = 4; // 4 × 500ms = 2 seconds
  let stableCount = 0;
  let lastSize: number | null = null;
  let elapsedMs = 0;

  while (elapsedMs < maxWaitMs) {
    try {
      const stat = statSync(filePath);
      const currentSize = stat.size;

      if (lastSize === currentSize && currentSize > 0) {
        stableCount++;
        if (stableCount >= stableCheckCount) {
          return true; // File is stable
        }
      } else {
        stableCount = 0; // Reset counter if size changed
      }

      lastSize = currentSize;
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
      elapsedMs += pollIntervalMs;
    } catch (err) {
      // File might not exist yet, retry
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
      elapsedMs += pollIntervalMs;
    }
  }

  console.warn(
    `[AudioIngestion] File stability check timeout after ${maxWaitMs}ms: ${filePath}`,
  );
  return false; // Timeout
}

/**
 * Broadcast ingestion status to all connected WebSocket clients
 */
function broadcastIngestionStatus(wss: WebSocketServer, status: IngestionStatus): void {
  const message = {
    type: "AUDIO_INGESTION_STATUS",
    timestamp: Date.now(),
    data: status,
  };

  wss.clients.forEach((client) => {
    if (client.readyState === 1) { // WebSocket.OPEN
      try {
        client.send(JSON.stringify(message));
      } catch (err) {
        console.error("[AudioIngestion] Failed to send WebSocket message:", err);
      }
    }
  });

  console.log(`[AudioIngestion] Broadcast status: ${status.filename} - ${status.status}`);
}

/**
 * Process an incoming audio file:
 * 1. Wait for file stability
 * 2. Check hash for duplicates
 * 3. Extract metadata and save to /data/audio
 * 4. Create database record
 * 5. Broadcast WebSocket notification
 */
async function processIncomingFile(
  filePath: string,
  audioUploadDir: string,
  wss: WebSocketServer,
): Promise<IngestionStatus> {
  const filename = basename(filePath);
  let status: IngestionStatus = { filename, status: "error" };

  try {
    console.log(`[AudioIngestion] Detected file: ${filename}`);

    // Step 1: Wait for file stability (2-second window, 30-second timeout)
    const isStable = await waitForFileStability(filePath);
    if (!isStable) {
      status = { filename, status: "timeout", error: "File transfer timeout" };
      console.warn(`[AudioIngestion] File timeout: ${filename}`);
      broadcastIngestionStatus(wss, status);
      return status;
    }

    console.log(`[AudioIngestion] File stable: ${filename}`);

    // Step 2: Read file and calculate hash
    const fileBuffer = readFileSync(filePath);
    const fileHash = calculateAudioHash(fileBuffer);
    const bytes = fileBuffer.length;

    console.log(`[AudioIngestion] Hash calculated: ${filename} = ${fileHash}`);

    // Step 3: Check for duplicates via database
    const existingSong = await db
      .select({ id: songs.id })
      .from(songs)
      .where(eq(songs.fileHash, fileHash))
      .limit(1);

    if (existingSong.length > 0) {
      // Duplicate detected - skip silently with log
      status = {
        filename,
        status: "skipped",
        songId: existingSong[0].id,
        hash: fileHash,
      };
      console.log(`[AudioIngestion] Duplicate detected (skipped): ${filename}`);
      broadcastIngestionStatus(wss, status);
      return status;
    }

    // Step 4: Extract metadata from audio file
    const audioMetadata = await extractAudioMetadata(fileBuffer, filename);
    console.log(
      `[AudioIngestion] Metadata extracted: ${filename} - duration: ${audioMetadata.duration}s`,
    );

    // Step 5: Save audio file to /data/audio with UUID filename
    const audioId = randomUUID();
    const processedAudio: ProcessedAudio = await saveAudioFile(
      fileBuffer,
      audioId,
      audioUploadDir,
      audioMetadata,
    );

    console.log(
      `[AudioIngestion] File saved to disk: ${filename} -> ${basename(processedAudio.filePath)}`,
    );

    // Step 6: Create song record in database
    // Note: We intentionally do NOT call createSong() route here because:
    // - It requires authentication and Express context
    // - We want to create a minimal song record suitable for ingestion
    // - Audio will be playback-disabled until user manually enables it
    const [newSong] = await db
      .insert(songs)
      .values({
        id: audioId,
        title: filename.replace(/\.[^/.]+$/, ""), // Remove extension for title
        filePath: processedAudio.filePath,
        duration: processedAudio.duration,
        fileExtension: processedAudio.fileExtension,
        fileSizeBytes: BigInt(processedAudio.fileSizeBytes), // Convert to bigint for database
        fileHash: processedAudio.fileHash,
        playbackEnabled: true, // Enable by default for ingested files
      })
      .returning({ id: songs.id });

    status = {
      filename,
      status: "success",
      songId: newSong.id,
      hash: fileHash,
      duration: processedAudio.duration,
      bytes,
    };

    console.log(
      `[AudioIngestion] Song created: ${filename} (ID: ${newSong.id})`,
    );
    broadcastIngestionStatus(wss, status);
    return status;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    status = { filename, status: "error", error: errorMsg };
    console.error(`[AudioIngestion] Error processing ${filename}:`, err);
    broadcastIngestionStatus(wss, status);
    return status;
  }
}

/**
 * AudioIngestionService manages the file system watcher for the ingestion folder
 */
export class AudioIngestionService {
  private watcher: FSWatcher | null = null;
  private incomingDir: string | null = null;
  private audioUploadDir: string;
  private wss: WebSocketServer;
  private processingSet: Set<string> = new Set(); // Track files currently being processed

  constructor(audioUploadDir: string, wss: WebSocketServer) {
    this.audioUploadDir = audioUploadDir;
    this.wss = wss;
  }

  /**
   * Start watching the ingestion folder
   * Only starts if AUDIO_INGESTION_DIR is configured
   */
  start(incomingDir: string): void {
    if (!incomingDir || incomingDir.trim().length === 0) {
      console.log("[AudioIngestion] Not enabled (AUDIO_INGESTION_DIR not configured)");
      return;
    }

    this.incomingDir = incomingDir;

    console.log(`[AudioIngestion] Starting folder monitor: ${incomingDir}`);

    // Initialize chokidar watcher with debouncing and docker volume support
    this.watcher = watch(incomingDir, {
      ignored: /(^|[\/\\])\.|\.tmp$/, // Ignore dot files and .tmp files
      persistent: true,
      awaitWriteFinish: {
        stabilityThreshold: 100, // Wait 100ms of no changes
        pollInterval: 100,
      },
      usePolling: false, // Let chokidar use native FS events when available
    });

    this.watcher.on("add", (filePath: string) => {
      // Skip if already processing this file
      if (this.processingSet.has(filePath)) {
        return;
      }

      // Only process audio files
      if (!/\.(mp3|mp4|m4a|wav|flac|aac|ogg|opus)$/i.test(filePath)) {
        return;
      }

      this.processingSet.add(filePath);

      // Process file asynchronously
      processIncomingFile(filePath, this.audioUploadDir, this.wss)
        .catch((err) => {
          console.error(`[AudioIngestion] Unexpected error processing ${filePath}:`, err);
        })
        .finally(() => {
          this.processingSet.delete(filePath);
        });
    });

    this.watcher.on("error", (err) => {
      console.error("[AudioIngestion] Watcher error:", err);
    });

    this.watcher.on("ready", () => {
      console.log("[AudioIngestion] Watcher ready");
    });
  }

  /**
   * Stop the file system watcher
   */
  stop(): Promise<void> {
    if (!this.watcher) {
      return Promise.resolve();
    }

    console.log("[AudioIngestion] Stopping folder monitor");
    return this.watcher.close();
  }

  /**
   * Check if watcher is active
   */
  isEnabled(): boolean {
    return this.watcher !== null && this.incomingDir !== null;
  }
}
