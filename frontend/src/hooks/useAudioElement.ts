import { useEffect, useRef, useCallback, useState } from "react";
import { usePlayerStore } from "../stores/usePlayerStore";

interface AudioElementState {
  currentTime: number;
  duration: number;
}

/**
 * Hook to manage HTML5 audio element lifecycle and sync with player store
 * Creates and manages a singleton audio element that handles playback
 * Syncs audio events with the Zustand player store
 */
export function useAudioElement() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [state, setState] = useState<AudioElementState>({ currentTime: 0, duration: 0 });

  const {
    currentSong,
    isPlaying,
    currentTime: storeCurrentTime,
    volume,
    pause: storePause,
    next: storeNext,
    repeatMode,
  } = usePlayerStore();

  // Initialize audio element (runs once on mount)
  useEffect(() => {
    if (audioRef.current) return; // Already initialized

    const audio = new Audio();
    audio.preload = "metadata";
    audio.style.display = "none";
    document.body.appendChild(audio);
    audioRef.current = audio;

    return () => {
      audio.pause();
      document.body.removeChild(audio);
      audioRef.current = null;
    };
  }, []);

  // Sync currentSong to audio src
  useEffect(() => {
    if (!audioRef.current) return;

    if (currentSong?.id) {
      // Use song ID to construct the audio endpoint
      const audioUrl = `/api/songs/${currentSong.id}/audio`;
      console.log("[Audio] Setting src:", { songId: currentSong.id, audioUrl });
      audioRef.current.src = audioUrl;
      audioRef.current.currentTime = 0;
    } else {
      console.log("[Audio] No song ID provided, clearing src");
      audioRef.current.src = "";
    }
  }, [currentSong]);

  // Sync isPlaying to audio playback
  useEffect(() => {
    if (!audioRef.current) return;

    if (isPlaying && currentSong?.id) {
      audioRef.current.play().catch((err) => {
        console.error("Failed to play audio:", err);
        storePause();
      });
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, currentSong, storePause]);

  // Sync volume to audio element
  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = Math.max(0, Math.min(1, volume));
  }, [volume]);

  // Seek handler - seek to specific time
  const handleSeekFromStore = useCallback(() => {
    if (!audioRef.current) return;
    if (!isPlaying) return; // Don't sync during pause to avoid double updates

    // Only seek if store time differs significantly from current time (>0.5s)
    if (Math.abs(storeCurrentTime - audioRef.current.currentTime) > 0.5) {
      audioRef.current.currentTime = storeCurrentTime;
    }
  }, [storeCurrentTime, isPlaying]);

  useEffect(() => {
    handleSeekFromStore();
  }, [handleSeekFromStore]);

  // Audio event handlers - sync back to store
  useEffect(() => {
    if (!audioRef.current) return;

    const audio = audioRef.current;

    // Debounce timeupdate to avoid excessive re-renders (max 4 updates/sec)
    let lastUpdateTime = 0;
    const handleTimeUpdate = () => {
      const now = Date.now();
      if (now - lastUpdateTime > 250) {
        // 250ms = 4 updates/sec
        setState({
          currentTime: audio.currentTime,
          duration: audio.duration,
        });
        lastUpdateTime = now;
      }
    };

    const handleDurationChange = () => {
      setState((prev) => ({
        ...prev,
        duration: audio.duration,
      }));
    };

    const handleEnded = () => {
      if (repeatMode === "one") {
        // Repeat current song: seek to 0 and replay
        audio.currentTime = 0;
        audio.play().catch((err) => {
          console.error("Failed to replay audio:", err);
          storePause();
        });
      } else {
        // Play next song or stop if no repeat
        storeNext();
      }
    };

    const handleError = (e: ErrorEvent) => {
      const errorCode = audio.error?.code;
      const errorMessage = audio.error?.message || "Unknown error";

      const errorDescriptions: Record<number, string> = {
        1: "MEDIA_ERR_ABORTED - Media loading was aborted",
        2: "MEDIA_ERR_NETWORK - Network error loading media",
        3: "MEDIA_ERR_DECODE - Media decode error (unsupported format or corrupted file)",
        4: "MEDIA_ERR_SRC_NOT_SUPPORTED - Media source not supported (unsupported codec)",
      };

      const errorDesc = errorCode ? errorDescriptions[errorCode] : "Unknown error";
      console.error(`Audio playback error: ${errorDesc}`, {
        errorCode,
        errorMessage,
        src: audio.src,
        event: e,
      });

      // Auto-skip to next song on error
      storeNext();
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("durationchange", handleDurationChange);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("durationchange", handleDurationChange);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
    };
  }, [storeNext, repeatMode, storePause]);

  // Update store currentTime and duration from local state
  useEffect(() => {
    usePlayerStore.setState({
      currentTime: state.currentTime,
      duration: state.duration,
    });
  }, [state]);

  return {
    audioRef,
    state,
  };
}
