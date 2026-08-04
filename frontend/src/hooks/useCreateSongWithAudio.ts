import { useCallback, useState } from "react";
import { useUploadAudio } from "./useUploadAudio";

interface CreateSongWithAudioResult {
  success: boolean;
  error?: string;
  songId?: string;
}

/**
 * Upload progress for a single file, using discriminated union pattern.
 * Percentage is only present when status is "uploading".
 */
export type UploadProgress =
  | {
      filename: string;
      fileSize: number; // in bytes
      fileContentHash?: string; // computed in-browser if possible
      status: "pending" | "complete" | "failed" | "skipped";
    }
  | {
      filename: string;
      fileSize: number; // in bytes
      fileContentHash?: string; // computed in-browser if possible
      status: "uploading";
      percentage: number;
    };

/**
 * Hook for creating songs with audio files in a single operation
 *
 * Process:
 * 1. Create a song with title derived from filename (without extension)
 * 2. Upload the audio file to the created song
 * 3. Handle errors and prevent orphaned data as much as possible
 *
 * The operation is atomic at the backend level (all DB writes together),
 * but network failures between steps could still leave orphaned data.
 * This is acceptable as users can clean up manually.
 *
 * @param onChange - Callback to track progress of file uploads
 * @param enabled - Whether the hook is enabled (controls whether processing happens)
 */
export function useCreateSongWithAudio(
  onChange?: (progress: UploadProgress[]) => void,
  enabled: boolean = true,
) {
  const [isCreating, setIsCreating] = useState(false);
  const { uploadAudio } = useUploadAudio();

  /**
   * Compute SHA-256 hash of file in browser
   */
  const computeFileHash = useCallback(async (file: File): Promise<string | undefined> => {
    try {
      const buffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    } catch {
      // If hashing fails, just skip it
      return undefined;
    }
  }, []);

  const createSongWithAudio = useCallback(
    async (audioFile: File): Promise<CreateSongWithAudioResult> => {
      if (!enabled) {
        return {
          success: false,
          error: "Hook is disabled",
        };
      }

      setIsCreating(true);

      try {
        // Initialize progress for this file
        const fileHash = await computeFileHash(audioFile);

        // Update to pending
        const pendingProgress: UploadProgress = {
          filename: audioFile.name,
          fileSize: audioFile.size,
          fileContentHash: fileHash,
          status: "pending",
        };
        onChange?.([pendingProgress]);

        // Step 1: Extract title from filename (remove extension)
        const filename = audioFile.name;
        const lastDotIndex = filename.lastIndexOf(".");
        const title = lastDotIndex > 0 ? filename.substring(0, lastDotIndex) : filename;

        // Step 2: Create the song via API
        const createResponse = await fetch("/api/songs", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ title }),
        });

        if (createResponse.status === 401) {
          window.location.assign("/login");
          return {
            success: false,
            error: "Authentication required",
          };
        }

        if (!createResponse.ok) {
          const data = await createResponse.json();
          const message = data?.error || createResponse.statusText;
          // Update progress to failed
          const failedProgress: UploadProgress = {
            filename: audioFile.name,
            fileSize: audioFile.size,
            fileContentHash: fileHash,
            status: "failed",
          };
          onChange?.([failedProgress]);
          return {
            success: false,
            error: `Failed to create song: ${message}`,
          };
        }

        const songData = await createResponse.json();
        const songId = songData.id;

        // Update progress to uploading
        const uploadingProgress: UploadProgress = {
          filename: audioFile.name,
          fileSize: audioFile.size,
          fileContentHash: fileHash,
          status: "uploading",
          percentage: 0,
        };
        onChange?.([uploadingProgress]);

        // Step 3: Upload the audio file to the created song
        const uploadResult = await uploadAudio(songId, audioFile);

        if (!uploadResult.success) {
          // Update progress to failed
          const failedProgress: UploadProgress = {
            filename: audioFile.name,
            fileSize: audioFile.size,
            fileContentHash: fileHash,
            status: "failed",
          };
          onChange?.([failedProgress]);
          return {
            success: false,
            error: `Song created but audio upload failed: ${uploadResult.error}`,
            songId,
          };
        }

        // Update progress to complete
        const completeProgress: UploadProgress = {
          filename: audioFile.name,
          fileSize: audioFile.size,
          fileContentHash: fileHash,
          status: "complete",
        };
        onChange?.([completeProgress]);

        return {
          success: true,
          songId,
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        // Update progress to failed
        const failedProgress: UploadProgress = {
          filename: audioFile.name,
          fileSize: audioFile.size,
          status: "failed",
        };
        onChange?.([failedProgress]);
        return {
          success: false,
          error: `Failed to create song with audio: ${message}`,
        };
      } finally {
        setIsCreating(false);
      }
    },
    [uploadAudio, enabled, onChange, computeFileHash],
  );

  return { createSongWithAudio, isCreating };
}
