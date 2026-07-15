import { useCallback } from "react";
import { Button } from "../../components/ui/Button";
import { toBrandId, type AlbumId, type SongId } from "../../types/brands";
import type { Album } from "../../api/schemas";

type AlbumTrack = Album["tracks"][number];

interface TrackActionsCellProps {
  track: AlbumTrack;
  isExpanded: boolean;
  onToggleTree: () => void;
  onUnlinkSong: (albumId: AlbumId, songId: SongId, trackNumber: number) => void;
  onSelectExistingSong: (trackNumber: number) => void;
  trackOperation: { type: "linking" | "unlinking"; error?: string | undefined } | undefined;
  albumId: AlbumId;
}

const TrackActionsCell = ({
  track,
  isExpanded,
  onToggleTree,
  onUnlinkSong,
  onSelectExistingSong,
  trackOperation,
  albumId,
}: TrackActionsCellProps) => {
  const isRegistered = track.isRegistered && Boolean(track.song?.id);

  const handleUnlink = useCallback(() => {
    if (isRegistered && track.song?.id) {
      onUnlinkSong(albumId, toBrandId<SongId>(track.song.id), track.trackNumber);
    }
  }, [isRegistered, track, onUnlinkSong, albumId]);

  const handleSelectSong = useCallback(() => {
    onSelectExistingSong(track.trackNumber);
  }, [track.trackNumber, onSelectExistingSong]);

  if (!isRegistered || !track.song) {
    return (
      <button
        type="button"
        onClick={handleSelectSong}
        disabled={trackOperation?.type === "linking"}
        className="rounded bg-sky-100 px-2 py-1 text-xs font-medium text-sky-700 hover:bg-sky-200 disabled:opacity-50"
        title="Link an existing song to this track"
      >
        {trackOperation?.type === "linking" ? "Linking…" : "Link Song"}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Button
          variant="secondary"
          onClick={onToggleTree}
          className="text-xs px-3 py-2"
        >
          {isExpanded ? "▼ hide tree" : "▶ show tree"}
        </Button>
        <Button
          variant="secondary"
          onClick={handleUnlink}
          disabled={trackOperation?.type === "unlinking"}
          className="text-xs px-3 py-2 bg-rose-100 text-rose-700 hover:bg-rose-200"
          title="Unlink song and restore original literal track info"
        >
          {trackOperation?.type === "unlinking" ? "Unlinking…" : "Unlink"}
        </Button>
      </div>
      {trackOperation?.error && trackOperation.type === "unlinking" && (
        <div className="text-xs text-rose-600">{trackOperation.error}</div>
      )}
    </div>
  );
};

export default TrackActionsCell;
