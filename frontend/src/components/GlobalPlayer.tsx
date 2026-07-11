import React, { useMemo, useRef } from "react";
import { usePlayer } from "../hooks/usePlayer";
import { useAudioElement } from "../hooks/useAudioElement";
import { usePlayerAnalytics } from "../hooks/usePlayerAnalytics";
import { getArtistNames } from "../lib/artistNames";
import { useArtistsStore } from "../stores/useArtistsStore";

/**
 * Global player component
 * Full-featured music player integrated in header
 * Manages playback, analytics, and queue control
 */
export function GlobalPlayer() {
  const {
    currentSong,
    isPlaying,
    currentTime,
    duration,
    volume,
    repeatMode,
    shuffleEnabled,
    pause,
    resume,
    next,
    previous,
    seek,
    setVolume,
    setRepeatMode,
    toggleShuffle,
  } = usePlayer();

  const artists = useArtistsStore((state) => state.artists);

  // Initialize audio element (handles playback)
  useAudioElement();

  // Initialize analytics tracking
  usePlayerAnalytics();

  // Progress bar ref for seeking
  const progressRef = useRef<HTMLDivElement | null>(null);

  const artistNames = useMemo(
    () => (currentSong ? getArtistNames(currentSong.artistIds ?? [], artists) : []),
    [currentSong, artists],
  );

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || !currentSong || !duration) return;

    const rect = progressRef.current.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const newTime = percent * duration;

    seek(Math.max(0, Math.min(newTime, duration)));
  };

  const formatTime = (seconds: number): string => {
    if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (!currentSong) {
    return null;
  }

  return (
    <div className="flex flex-1 items-center gap-4">
      {/* Song Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-slate-900">{currentSong.title}</p>
        <p className="truncate text-xs text-slate-500">{artistNames.join(", ")}</p>
      </div>

      {/* Progress Bar */}
      <div className="flex w-64 items-center gap-2">
        <span className="text-xs text-slate-500">{formatTime(currentTime)}</span>
        <div
          ref={progressRef}
          onClick={handleProgressClick}
          className="h-1 flex-1 cursor-pointer rounded-full bg-slate-300 hover:bg-slate-400"
        >
          <div
            className="h-full rounded-full bg-sky-500 transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <span className="text-xs text-slate-500">{formatTime(duration)}</span>
      </div>

      {/* Playback Controls */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={previous}
          disabled={!currentSong}
          title="Previous (P)"
          className="rounded p-1 text-slate-600 hover:bg-slate-200 hover:text-slate-900 disabled:opacity-50 disabled:hover:bg-transparent"
        >
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
          </svg>
        </button>

        <button
          type="button"
          onClick={() => (isPlaying ? pause() : resume())}
          className="rounded-full bg-sky-500 p-1.5 text-white hover:bg-sky-600 disabled:opacity-50"
        >
          {isPlaying ? (
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
            </svg>
          ) : (
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        <button
          type="button"
          onClick={next}
          disabled={!currentSong}
          title="Next (N)"
          className="rounded p-1 text-slate-600 hover:bg-slate-200 hover:text-slate-900 disabled:opacity-50 disabled:hover:bg-transparent"
        >
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M16 18h2V6h-2zm-11-7l8.5-6v12z" />
          </svg>
        </button>

        {/* Repeat Mode Toggle */}
        <button
          type="button"
          onClick={() => {
            const modes: Array<"off" | "one" | "all"> = ["off", "one", "all"];
            const currentIndex = modes.indexOf(repeatMode);
            const nextMode = modes[(currentIndex + 1) % modes.length];
            setRepeatMode(nextMode);
          }}
          title={`Repeat: ${repeatMode}`}
          className={`rounded p-1 text-sm transition ${
            repeatMode === "off"
              ? "text-slate-400 hover:text-slate-600"
              : "bg-sky-100 text-sky-600 hover:bg-sky-200"
          }`}
        >
          {repeatMode === "one" ? (
            <span className="text-xs font-semibold">⟲1</span>
          ) : (
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
            </svg>
          )}
        </button>

        {/* Shuffle Toggle */}
        <button
          type="button"
          onClick={toggleShuffle}
          title="Shuffle"
          className={`rounded p-1 transition ${
            shuffleEnabled
              ? "bg-sky-100 text-sky-600 hover:bg-sky-200"
              : "text-slate-400 hover:text-slate-600"
          }`}
        >
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M10.59 9.38L6.5 5.29 8 3.82 15.47 11.3 4 22.77 2.53 21.3 6.62 17.21H3v-2h7.59zM14.5 4l2.04 2.04L4 18.58 2.58 17.17 14.5 4zm.33 9.41l-2.47 2.47.02.05c0 .8-.19 1.54-.54 2.2l-.5-1.07L7.7 11.49l.33-.41h2.96l1.83 1.83z" />
          </svg>
        </button>

        {/* Volume Control */}
        <div className="flex items-center gap-1">
          <svg className="h-4 w-4 text-slate-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.26 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
          </svg>
          <input
            type="range"
            min="0"
            max="100"
            value={Math.round(volume * 100)}
            onChange={(e) => setVolume(Number(e.target.value) / 100)}
            className="h-1 w-16 cursor-pointer"
            title="Volume"
          />
        </div>
      </div>
    </div>
  );
}

export default GlobalPlayer;
