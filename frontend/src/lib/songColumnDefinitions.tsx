import { PlaybackEnabledToggle } from "../components/PlaybackEnabledToggle";
import type { ColumnDefinition } from "../components/SongTable";

/**
 * Reusable column definition for playback enabled toggle
 * Used across all song lists (artist, album, playlist, etc.)
 *
 * The toggle subscribes to store updates directly via isOwnOrigin pattern,
 * so no callback is needed here.
 */
export function createPlaybackEnabledColumn(): ColumnDefinition {
  return {
    key: "playback",
    label: "Playback Enabled",
    render: (song) => (
      <div className="h-6">
        <PlaybackEnabledToggle
          songId={song.id}
          initialEnabled={song.playbackEnabled}
          filePath={song.filePath}
        />
      </div>
    ),
  };
}
