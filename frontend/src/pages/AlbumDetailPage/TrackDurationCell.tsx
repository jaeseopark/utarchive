import { useMemo } from "react";
import type { Album, Song } from "../../api/schemas";

type AlbumTrack = Album["tracks"][number];

interface TrackDurationCellProps {
  track: AlbumTrack;
  album: Album;
  songDetail: Song | undefined;
}

const formatDuration = (seconds: number | undefined): string => {
  if (seconds === undefined || seconds === null) return "—";
  const minutes = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${minutes}:${String(secs).padStart(2, "0")}`;
};

const TrackDurationCell = ({ track, album, songDetail }: TrackDurationCellProps) => {
  const duration = useMemo(() => {
    // Try to get duration from registered song first
    if (track.isRegistered && track.song?.id && songDetail?.duration) {
      return formatDuration(songDetail.duration);
    }
    // Fall back to trackList duration
    const trackListItem = album.trackList.find((t) => t.number === track.trackNumber);
    if (trackListItem?.duration) {
      return formatDuration(trackListItem.duration);
    }
    // Default fallback
    return "—";
  }, [track, album, songDetail]);

  return <span>{duration}</span>;
};

export default TrackDurationCell;
