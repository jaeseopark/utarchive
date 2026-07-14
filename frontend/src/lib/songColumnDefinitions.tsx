import { PlaybackEnabledToggle } from "../components/PlaybackEnabledToggle";
import type { ColumnDefinition } from "../components/SongTable";

/**
 * Reusable column definition for playback enabled toggle
 * Used across all song lists (artist, album, playlist, etc.)
 */
export function createPlaybackEnabledColumn(
  onPlaybackEnabledChange: (songId: string, enabled: boolean) => void
): ColumnDefinition {
  return {
    key: "playback",
    label: "Playback Enabled",
    render: (song) => (
      <div className="h-6">
        <PlaybackEnabledToggle
          songId={song.id}
          isEnabled={song.playbackEnabled}
          onPlaybackEnabledChange={onPlaybackEnabledChange}
        />
      </div>
    ),
  };
}
