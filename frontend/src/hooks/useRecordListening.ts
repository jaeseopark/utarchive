import { useCallback } from "react";
import { api } from "../api/client";
import { AnalyticsListenResponseSchema } from "../api/schemas";

export interface ListeningEventParams {
  songId: string;
  startedAt: string; // ISO string
  durationSeconds: number;
  playbackPercent: number;
  userAgent: string;
}

/**
 * Hook to record detailed listening events with analytics tracking
 * Abstracts the API call for recording listening sessions
 */
export function useRecordListening() {
  const recordListening = useCallback(async (params: ListeningEventParams) => {
    try {
      await api.post("/api/analytics/listen", params, AnalyticsListenResponseSchema);
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to record listening analytics";
      console.error("Analytics error:", message);
      return { success: false, error: message };
    }
  }, []);

  return {
    recordListening,
  };
}
