import { useEffect, useRef } from "react";
import { usePlayerStore } from "../stores/usePlayerStore";
import { useRecordListening } from "./useRecordListening";

/**
 * Hook to centralize listening session tracking and analytics
 * Automatically sends analytics events when:
 * - Song ends
 * - User pauses after listening for >5 seconds
 * - Component unmounts (uses sendBeacon for reliability)
 */
export function usePlayerAnalytics() {
  const { recordListening } = useRecordListening();

  const currentSong = usePlayerStore((state) => state.currentSong);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const currentTime = usePlayerStore((state) => state.currentTime);

  // Refs to track listening session state
  const sessionRef = useRef<{
    songId: string;
    startedAt: Date;
    initialTime: number;
  } | null>(null);

  // Initialize listening session when song starts
  useEffect(() => {
    if (!currentSong || !isPlaying) return;

    sessionRef.current = {
      songId: currentSong.id,
      startedAt: new Date(),
      initialTime: currentTime,
    };
  }, [currentSong?.id, isPlaying]);

  // Send analytics when song pauses (if listened >5 sec) or ends
  useEffect(() => {
    if (!sessionRef.current || !currentSong) return;

    // Only send analytics if session is active (was playing)
    if (isPlaying) return;

    const sendAnalytics = async (reason: string) => {
      if (!sessionRef.current || !currentSong) return;

      const durationSeconds = currentTime - sessionRef.current.initialTime;
      if (durationSeconds < 5) {
        // Only record if listened for >5 seconds
        sessionRef.current = null;
        return;
      }

      const effectiveDuration = currentSong?.duration ?? 1;
      const playbackPercent = Math.min(100, (durationSeconds / effectiveDuration) * 100);

      try {
        await recordListening({
          songId: currentSong.id,
          startedAt: sessionRef.current.startedAt.toISOString(),
          durationSeconds: Math.round(durationSeconds * 100) / 100, // Round to 2 decimals
          playbackPercent: Math.round(playbackPercent * 100) / 100,
          userAgent: navigator.userAgent,
        });
      } catch (err) {
        console.error(`Failed to send analytics (${reason}):`, err);
      }

      sessionRef.current = null;
    };

    // Send analytics on pause
    sendAnalytics("pause");
  }, [isPlaying, currentSong, currentTime, recordListening]);

  // Send analytics on component unmount (use sendBeacon for reliability)
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!sessionRef.current || !currentSong) return;

      const durationSeconds = currentTime - sessionRef.current.initialTime;
      if (durationSeconds < 5) return; // Don't track very short sessions

      const effectiveDuration = currentSong?.duration ?? 1;
      const playbackPercent = Math.min(100, (durationSeconds / effectiveDuration) * 100);

      const payload = JSON.stringify({
        songId: currentSong.id,
        startedAt: sessionRef.current.startedAt.toISOString(),
        durationSeconds: Math.round(durationSeconds * 100) / 100,
        playbackPercent: Math.round(playbackPercent * 100) / 100,
        userAgent: navigator.userAgent,
      });

      // Use sendBeacon to ensure delivery during page unload
      navigator.sendBeacon("/api/analytics/listen", payload);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [currentSong, currentTime]);
}
