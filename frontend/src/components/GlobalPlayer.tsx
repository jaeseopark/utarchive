import { usePlayer } from '../hooks/usePlayer';

/**
 * Global player component (v1 - stub)
 * Displays current song and basic controls
 * Audio element integration deferred to future phase
 */
export function GlobalPlayer() {
  const { currentSong, isPlaying, play, pause } = usePlayer();

  if (!currentSong) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 border-t border-slate-300 bg-slate-50 px-4 py-3 shadow-lg">
      <div className="mx-auto flex max-w-6xl items-center gap-4">
        <div className="flex-1 truncate">
          <p className="truncate text-sm font-medium text-slate-900">{currentSong.title}</p>
          <p className="truncate text-xs text-slate-600">{currentSong.artistNames.join(', ')}</p>
        </div>

        <button
          type="button"
          onClick={() => (isPlaying ? pause() : play(currentSong))}
          className="rounded-full border border-slate-400 bg-sky-500 px-4 py-2 text-sm font-medium text-white transition hover:border-slate-500 hover:bg-sky-600"
        >
          {isPlaying ? 'Pause' : 'Play'}
        </button>
      </div>
    </div>
  );
}

export default GlobalPlayer;
