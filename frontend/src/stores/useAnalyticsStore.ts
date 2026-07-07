import { create } from 'zustand';
import { z } from 'zod';
import { api } from '../api/client';

const AnalyticsListenSchema = z.object({
  ok: z.literal(true),
});

export interface ListeningSession {
  songId: string;
  startedAt: Date;
  pausedAt: Date | null;
}

export interface AnalyticsState {
  currentSession: ListeningSession | null;
  isTracking: boolean;

  startListening: (songId: string) => void;
  pauseListening: () => void;
  resumeListening: () => void;
  stopListening: () => Promise<void>;
  updateProgress: (seconds: number) => void;
}

export const useAnalyticsStore = create<AnalyticsState>((set, get) => ({
  currentSession: null,
  isTracking: false,

  startListening: (songId: string) => {
    set({
      currentSession: {
        songId,
        startedAt: new Date(),
        pausedAt: null,
      },
      isTracking: true,
    });
  },

  pauseListening: () => {
    set((state) => {
      if (!state.currentSession) return state;
      return {
        currentSession: {
          ...state.currentSession,
          pausedAt: new Date(),
        },
        isTracking: false,
      };
    });
  },

  resumeListening: () => {
    set((state) => {
      if (!state.currentSession || !state.currentSession.pausedAt) return state;
      return {
        currentSession: {
          ...state.currentSession,
          pausedAt: null,
        },
        isTracking: true,
      };
    });
  },

  stopListening: async () => {
    const session = get().currentSession;
    if (!session) return;

    try {
      const listenedSeconds = Math.floor((new Date().getTime() - session.startedAt.getTime()) / 1000);
      await api.post(
        '/api/analytics/listen',
        {
          songId: session.songId,
          listenedSeconds: Math.max(listenedSeconds, 0),
        },
        AnalyticsListenSchema,
      );
    } catch {
      // Silently fail
    } finally {
      set({ currentSession: null, isTracking: false });
    }
  },

  updateProgress: (seconds: number) => {
    // Can be used to track progress in UI
  },
}));
