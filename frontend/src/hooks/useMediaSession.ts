import { useEffect } from "react";
import { usePlayerStore } from "../stores/usePlayerStore";
import { useArtistsStore } from "../stores/useArtistsStore";
import { useResolveCoverArt } from "./useResolveCoverArt";
import { getArtistNames } from "../lib/artistNames";
import { toBrandId, type SongId } from "../types/brands";

/**
 * Hook to integrate with OS-level media controls via MediaSession API
 * Connects hardware media keys, Bluetooth headphones, and lock screen controls
 * to the player's playback functions
 *
 * Supports:
 * - macOS keyboard media controls (play/pause/next/previous)
 * - Bluetooth headphone media commands
 * - Lock screen controls
 * - Media metadata display on OS notifications/lock screen
 */
export function useMediaSession() {
  const { currentSong, isPlaying, resume, pause, next, previous } = usePlayerStore();

  const artists = useArtistsStore((state) => state.artists);

  // Resolve cover art with tree traversal (song → albums → parent recursively)
  const { resolvedCoverArtId } = useResolveCoverArt({
    songId: currentSong?.id ? toBrandId<SongId>(currentSong.id) : undefined,
  });

  // Update MediaSession metadata when song changes
  useEffect(() => {
    if (!("mediaSession" in navigator)) {
      console.debug("[MediaSession] API not supported in this browser");
      return;
    }

    if (!currentSong) {
      navigator.mediaSession.metadata = null;
      return;
    }

    const artistNames = getArtistNames(currentSong.artistIds ?? [], artists);

    // Build artwork array using resolved cover art ID (with tree traversal)
    const artwork = resolvedCoverArtId
      ? [{ src: `/api/cover-art/${resolvedCoverArtId}`, sizes: "512x512", type: "image/jpeg" }]
      : [];

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentSong.title,
        artist: artistNames.join(", "),
        artwork,
      });
      console.debug("[MediaSession] Updated metadata:", {
        title: currentSong.title,
        artist: artistNames.join(", "),
        hasCoverArt: !!resolvedCoverArtId,
      });
    } catch (error) {
      console.error("[MediaSession] Failed to set metadata:", error);
    }
  }, [currentSong, artists, resolvedCoverArtId]);

  // Update playback state and register action handlers
  useEffect(() => {
    if (!("mediaSession" in navigator)) {
      return;
    }

    const ms = navigator.mediaSession;

    // Update playback state
    try {
      ms.playbackState = isPlaying ? "playing" : "paused";
    } catch (error) {
      console.error("[MediaSession] Failed to set playback state:", error);
    }

    // Set up action handlers for hardware controls
    try {
      ms.setActionHandler("play", () => {
        console.debug("[MediaSession] Play action triggered");
        resume();
      });

      ms.setActionHandler("pause", () => {
        console.debug("[MediaSession] Pause action triggered");
        pause();
      });

      ms.setActionHandler("nexttrack", () => {
        console.debug("[MediaSession] Next track action triggered");
        next();
      });

      ms.setActionHandler("previoustrack", () => {
        console.debug("[MediaSession] Previous track action triggered");
        previous();
      });
    } catch (error) {
      console.error("[MediaSession] Failed to set action handlers:", error);
    }

    // Cleanup: Remove handlers on unmount
    return () => {
      try {
        ms.setActionHandler("play", null);
        ms.setActionHandler("pause", null);
        ms.setActionHandler("nexttrack", null);
        ms.setActionHandler("previoustrack", null);
      } catch (error) {
        console.error("[MediaSession] Failed to clean up action handlers:", error);
      }
    };
  }, [isPlaying, resume, pause, next, previous]);

  // Optional: Handle seeking via lock screen slider (if supported)
  useEffect(() => {
    if (!("mediaSession" in navigator)) {
      return;
    }

    const ms = navigator.mediaSession;
    const { seek } = usePlayerStore.getState();

    try {
      ms.setActionHandler("seekto", (details) => {
        console.debug("[MediaSession] Seek action triggered:", {
          seekTime: details.seekTime,
          fastSeek: details.fastSeek,
        });

        if (typeof details.seekTime === "number") {
          seek(details.seekTime);
        }
      });
    } catch (error) {
      console.error("[MediaSession] Failed to set seekto handler:", error);
    }

    return () => {
      try {
        ms.setActionHandler("seekto", null);
      } catch (error) {
        console.error("[MediaSession] Failed to clean up seekto handler:", error);
      }
    };
  }, []);
}
