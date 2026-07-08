import { FC, useMemo } from 'react';

type CoverArtProps = {
  coverArtId: string | null | undefined;
  size?: 128 | 1024;
  className?: string;
  alt?: string;
};

const PLACEHOLDER_IMAGE = '/images/placeholder-cover-art.png';

/**
 * Get the thumbnail URL for a cover art ID and size
 */
const getCoverArtUrl = (coverArtId: string | null | undefined, size: number): string => {
  if (!coverArtId) {
    return PLACEHOLDER_IMAGE;
  }
  return `/api/cover-art/${coverArtId}/thumbnail/${size}`;
};

/**
 * CoverArt component for displaying cover art images with fallback to placeholder
 */
export const CoverArt: FC<CoverArtProps> = ({
  coverArtId,
  size = 1024,
  className,
  alt = 'Cover art',
}) => {
  const imageUrl = useMemo(() => getCoverArtUrl(coverArtId, size), [coverArtId, size]);

  return (
    <img
      src={imageUrl}
      alt={alt}
      className={className}
      onError={(e) => {
        // Fallback to placeholder if image fails to load
        if (e.target instanceof HTMLImageElement) {
          if (e.target.src !== PLACEHOLDER_IMAGE) {
            e.target.src = PLACEHOLDER_IMAGE;
          }
        }
      }}
    />
  );
};

export default CoverArt;