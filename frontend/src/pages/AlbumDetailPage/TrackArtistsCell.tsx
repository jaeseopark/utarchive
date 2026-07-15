import { Fragment, useMemo } from "react";
import { Link } from "react-router-dom";
import type { Album, Artist, Song } from "../../api/schemas";

type AlbumTrack = Album["tracks"][number];

interface TrackArtistsCellProps {
  track: AlbumTrack;
  artists: Artist[];
  songDetail: Song | undefined;
}

const TrackArtistsCell = ({ track, artists, songDetail }: TrackArtistsCellProps) => {
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

  const artistMap = new Map(artists.map((artist) => [artist.id, artist.name]));

  return (
    <div className="flex flex-wrap gap-1">
      {artistIds.map((artistId, index) => {
        const artistName = artistMap.get(artistId);
        const artistPath: string = `/artists/${String(artistId)}`;
        return (
          <Fragment key={artistId}>
            {index > 0 && <span className="text-slate-400">,</span>}
            <Link to={artistPath} className="text-sky-500 hover:underline">
              {artistName || "Unknown"}
            </Link>
          </Fragment>
        );
      })}
    </div>
  );
};

export default TrackArtistsCell;
