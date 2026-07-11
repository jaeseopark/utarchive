import { useCallback, useState, useRef, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";

/**
 * Hook for uploading audio files to a song
 * Handles multipart/form-data file uploads to /api/songs/:id/audio
 *
 * Bug fixes:
 * - Cleanup logic moved to useEffect (runs only on unmount, not on every render)
 * - Only abort when a new upload starts, not automatically on every callback invocation
 * - Prevents premature stream termination that causes "Unexpected end of form" errors
 */
export function useUploadAudio() {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track the active controller using a ref that persists across re-renders
  const activeControllerRef = useRef<AbortController | null>(null);

  // Clean up on unmount ONLY, do not auto-abort mid-render cycles
  useEffect(() => {
    return () => {
      if (activeControllerRef.current) {
        activeControllerRef.current.abort();
      }
    };
  }, []);

  const uploadAudio = useCallback(
    async (songId: string, file: File): Promise<{ success: boolean; error?: string }> => {
      // Only abort if an actual file is ALREADY uploading from this specific instance
      if (activeControllerRef.current) {
        activeControllerRef.current.abort();
      }

      const abortController = new AbortController();
      activeControllerRef.current = abortController;

      // Set up a timeout to prevent indefinite hangs on slow networks
      // 5 minutes (300 seconds) is reasonable for large audio files
      const timeoutId = setTimeout(() => {
        abortController.abort();
      }, 300000); // 5 minute timeout

      setIsUploading(true);
      setError(null);

      try {
        const formData = new FormData();
        formData.append("file", file);

        const requestId = uuidv4();

        const response = await fetch(`/api/songs/${songId}/audio`, {
          method: "POST",
          credentials: "include",
          headers: {
            "X-Request-ID": requestId,
            // DO NOT manual set Content-Type header here
          },
          body: formData,
          signal: abortController.signal,
        });

        if (response.status === 401) {
          window.location.assign("/login");
          return { success: false, error: "Authentication required" };
        }

        const data = await response.json();

        if (!response.ok) {
          const message = data?.error || response.statusText;
          setError(message);
          return { success: false, error: message };
        }

        return { success: true };
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          console.log("[useUploadAudio] Upload was cancelled or timed out");
          return { success: false, error: "Upload timed out or was cancelled" };
        }

        const message = err instanceof Error ? err.message : "Failed to upload audio";
        setError(message);
        return { success: false, error: message };
      } finally {
        clearTimeout(timeoutId);
        if (activeControllerRef.current === abortController) {
          activeControllerRef.current = null;
          setIsUploading(false);
        }
      }
    },
    [],
  );

  return { uploadAudio, isUploading, error };
}
