import { usePlayerStore } from "../stores/usePlayerStore";

/**
 * Hook to access and control music player
 */
export function usePlayer() {
  const {
    currentSong,
    isPlaying,
    currentTime,
    duration,
    volume,
    queue,
    queueIndex,
    shuffleEnabled,
    repeatMode,
    play,
    pause,
    resume,
    seek,
    setVolume,
    next,
    previous,
    setQueue,
    addToQueue,
    removeFromQueue,
    toggleShuffle,
    setRepeatMode,
  } = usePlayerStore();

  return {
    currentSong,
    isPlaying,
    currentTime,
    duration,
    volume,
    queue,
    queueIndex,
    shuffleEnabled,
    repeatMode,
    play,
    pause,
    resume,
    seek,
    setVolume,
    next,
    previous,
    setQueue,
    addToQueue,
    removeFromQueue,
    toggleShuffle,
    setRepeatMode,
  };
}
