import { useCallback } from "react";
import { Link } from "react-router-dom";
import type { Song } from "../../api/schemas";
import type { Album } from "../../api/schemas";

type AlbumTrack = Album["tracks"][number];

interface TrackSongCellProps {
  track: AlbumTrack;
  songDetail: Song | undefined;
  onPlaySong: (song: Song) => void;
}

const TrackSongCell = ({ track, songDetail, onPlaySong }: TrackSongCellProps) => {
  const isRegistered = track.isRegistered && Boolean(track.song?.id);

  const handlePlayClick = useCallback(() => {
    if (isRegistered && songDetail?.filePath) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, no-restricted-syntax
      onPlaySong(songDetail as any);
    }
  }, [isRegistered, songDetail, onPlaySong]);

  if (!isRegistered || !track.song) {
    return <span className="text-slate-700">{track.referenceTitle ?? "—"}</span>;
  }

  const hasAudio = songDetail?.filePath;

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handlePlayClick}
        disabled={!hasAudio}
        className="flex-shrink-0 inline-flex items-center justify-center w-5 h-5 rounded transition text-emerald-600 hover:bg-emerald-100 disabled:text-slate-400 disabled:hover:bg-transparent"
        title={hasAudio ? "Play song" : "No audio file"}
        type="button"
      >
        ▶
      </button>
      <Link to={`/songs/${track.song.id}`} className="text-sky-500 hover:underline">
        {songDetail?.title || track.song.title}
      </Link>
    </div>
  );
};

export default TrackSongCell;
