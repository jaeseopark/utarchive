import React from "react";
import { Link } from "react-router-dom";
import { getArtistNames } from "../lib/artistNames";
import type { Artist } from "../api/schemas";

interface ArtistNameListProps {
  artistIds?: string[];
  artistNames?: string[];
  artists?: Artist[];
  disableLinks?: boolean;
  className?: string;
  delimiter?: string;
}

export default function ArtistNameList({
  artistIds,
  artistNames,
  artists,
  disableLinks = false,
  className,
  delimiter = ", ",
}: ArtistNameListProps) {
  const resolvedArtistNames = React.useMemo(() => {
    if (artistNames && artistNames.length > 0) {
      return artistNames;
    }

    if (!artistIds || artistIds.length === 0) {
      return [];
    }

    const map = artists ? new Map(artists.map((artist) => [artist.id, artist.name])) : new Map();

    return getArtistNames(artistIds, map);
  }, [artistIds, artistNames, artists]);

  if (resolvedArtistNames.length === 0) {
    return <>Unknown</>;
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
