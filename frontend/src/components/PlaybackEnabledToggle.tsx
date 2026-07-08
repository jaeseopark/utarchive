import { useState } from 'react';
import { api } from '../api/client';
import { SongSchema } from '../api/schemas';

interface PlaybackEnabledToggleProps {
  songId: string;
  isEnabled: boolean;
  filePath?: string | null;
  onPlaybackEnabledChange?: (songId: string, newPlaybackEnabled: boolean) => void;
}

export function PlaybackEnabledToggle({
  songId,
  isEnabled,
  filePath,
  onPlaybackEnabledChange,
}: PlaybackEnabledToggleProps) {
  const [isUpdating, setIsUpdating] = useState(false);

  const hasFile = Boolean(filePath);
  const isDisabled = !hasFile || isUpdating;

  const handleToggle = async () => {
    if (isDisabled) {
      return;
    }

    setIsUpdating(true);
    try {
      const newPlaybackEnabled = !isEnabled;
      await api.patch(`/api/songs/${songId}`, { playbackEnabled: newPlaybackEnabled }, SongSchema);
      onPlaybackEnabledChange?.(songId, newPlaybackEnabled);
    } catch (err) {
      console.error('Failed to update playback enabled status:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  const getTitle = () => {
    if (!hasFile) return 'No file attached';
    if (isUpdating) return 'Updating…';
    return isEnabled ? 'Enabled' : 'Disabled';
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isDisabled}
      className={`relative inline-flex h-full aspect-video rounded-full transition-colors ${
        isEnabled ? 'bg-emerald-500' : 'bg-slate-300'
      } ${isDisabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:opacity-90'}`}
      title={getTitle()}
    >
      <span
        className={`absolute top-1/2 left-1 -translate-y-1/2 h-[calc(100%-8px)] aspect-square rounded-full bg-white shadow-lg transition-transform ${
          isEnabled ? 'translate-x-[calc(100%-4px)]' : 'translate-x-0'
        }`}
      />
    </button>
  );
}
