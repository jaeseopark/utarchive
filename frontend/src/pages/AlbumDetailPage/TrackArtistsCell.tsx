import { useMemo } from "react";
import ArtistNameList from "../../components/ArtistNameList";
import type { Album, Song } from "../../api/schemas";

type AlbumTrack = Album["tracks"][number];

interface TrackArtistsCellProps {
  track: AlbumTrack;
  songDetail: Song | undefined;
}

const TrackArtistsCell = ({ track, songDetail }: TrackArtistsCellProps) => {
  const artistIds = useMemo(() => {
    // Try to get artist IDs from registered song first
    if (track.isRegistered && track.song?.id && songDetail?.artistIds) {
      if (songDetail.artistIds.length > 0) {
        return songDetail.artistIds;
      }
    }
    // Default fallback
    return [];
  }, [track, songDetail]);

  if (artistIds.length === 0) {
    return <span>—</span>;
  }

  return (
    <div className="flex flex-wrap">
      <ArtistNameList artistIds={artistIds} />
    </div>
  );
};

export default TrackArtistsCell;
