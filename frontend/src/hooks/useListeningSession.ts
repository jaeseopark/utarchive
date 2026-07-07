import { useAnalyticsStore } from '../stores/useAnalyticsStore';

/**
 * Hook to manage listening session
 */
export function useListeningSession() {
  const { currentSession, isTracking, startListening, pauseListening, resumeListening, stopListening, updateProgress } = useAnalyticsStore();

  return {
    currentSession,
    isTracking,
    startListening,
    pauseListening,
    resumeListening,
    stopListening,
    updateProgress,
  };
}
