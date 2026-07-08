import { create } from 'zustand';
import { type Song } from '../api/schemas';

export interface PlayerState {
  currentSong: Song | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;

  queue: Song[];
  queueIndex: number;
  shuffleEnabled: boolean;
  repeatMode: 'off' | 'one' | 'all';

  play: (song: Song) => void;
  pause: () => void;
  resume: () => void;
  seek: (seconds: number) => void;
  setVolume: (volume: number) => void;
  next: () => void;
  previous: () => void;
  setQueue: (songs: Song[], startIndex?: number) => void;
  addToQueue: (song: Song) => void;
  removeFromQueue: (index: number) => void;
  toggleShuffle: () => void;
  setRepeatMode: (mode: 'off' | 'one' | 'all') => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentSong: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 0.8,

  queue: [],
  queueIndex: -1,
  shuffleEnabled: false,
  repeatMode: 'off',

  play: (song: Song) => {
    set({
      currentSong: song,
      isPlaying: true,
      currentTime: 0,
      queue: [song],
      queueIndex: 0,
    });
  },

  pause: () => {
    set({ isPlaying: false });
  },

  resume: () => {
    set({ isPlaying: true });
  },

  seek: (seconds: number) => {
    set({ currentTime: seconds });
  },

  setVolume: (volume: number) => {
    set({ volume: Math.max(0, Math.min(1, volume)) });
  },

  next: () => {
    const { queue, queueIndex, repeatMode } = get();
    if (queue.length === 0) return;

    let nextIndex = queueIndex + 1;
    if (nextIndex >= queue.length) {
      if (repeatMode === 'all') {
        nextIndex = 0;
      } else {
        set({ isPlaying: false });
        return;
      }
    }

    set({
      queueIndex: nextIndex,
      currentSong: queue[nextIndex],
      currentTime: 0,
    });
  },

  previous: () => {
    const { queue, queueIndex } = get();
    if (queue.length === 0) return;

    let prevIndex = queueIndex - 1;
    if (prevIndex < 0) {
      prevIndex = queue.length - 1;
    }

    set({
      queueIndex: prevIndex,
      currentSong: queue[prevIndex],
      currentTime: 0,
    });
  },

  setQueue: (songs: Song[], startIndex = 0) => {
    if (songs.length === 0) {
      set({ queue: [], queueIndex: -1, currentSong: null });
      return;
    }

    set({
      queue: songs,
      queueIndex: startIndex,
      currentSong: songs[startIndex],
      currentTime: 0,
      isPlaying: true,
    });
  },

  addToQueue: (song: Song) => {
    set((state) => ({
      queue: [...state.queue, song],
    }));
  },

  removeFromQueue: (index: number) => {
    set((state) => {
      const newQueue = state.queue.filter((_, i) => i !== index);
      let newIndex = state.queueIndex;

      if (index === state.queueIndex) {
        newIndex = Math.min(newIndex, newQueue.length - 1);
      } else if (index < state.queueIndex) {
        newIndex -= 1;
      }

      return {
        queue: newQueue,
        queueIndex: newIndex,
        currentSong: newQueue[newIndex] ?? null,
      };
    });
  },

  toggleShuffle: () => {
    set((state) => ({ shuffleEnabled: !state.shuffleEnabled }));
  },

  setRepeatMode: (mode: 'off' | 'one' | 'all') => {
    set({ repeatMode: mode });
  },
}));
