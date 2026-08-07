import React from "react";
import { Link } from "react-router-dom";
import { getArtistNames } from "../lib/artistNames";
import { useArtistsStore } from "../stores/useArtistsStore";

interface ArtistNameListProps {
  artistIds: string[];
  disableLinks?: boolean;
  className?: string;
  delimiter?: string;
}

export default function ArtistNameList({
  artistIds,
  disableLinks = false,
  className,
  delimiter = ", ",
}: ArtistNameListProps) {
  const artists = useArtistsStore((state) => state.artists);

  const resolvedArtistNames = React.useMemo(() => {
    if (!artistIds || artistIds.length === 0) {
      return [];
    }

    const map = new Map(artists.map((artist) => [artist.id, artist.name]));

    return getArtistNames(artistIds, map);
  }, [artistIds, artists]);

  if (resolvedArtistNames.length === 0) {
    return <>-</>;
  }

  return (
    <span className={className}>
      {resolvedArtistNames.map((name, index) => {
        const artistId = artistIds?.[index];
        return (
          <React.Fragment key={artistId ?? `${name}-${index}`}>
            {index > 0 && <span className="text-slate-400">{delimiter}</span>}
            {disableLinks || !artistId ? (
              name
            ) : (
              <Link to={`/artists/${artistId}`} className="text-sky-500 hover:underline">
                {name}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </span>
  );
}
