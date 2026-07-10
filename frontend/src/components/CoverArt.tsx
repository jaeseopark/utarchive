import { FC, useMemo, useState } from "react";

type CoverArtProps = {
  coverArtId: string | null | undefined;
  size?: 128 | 1024;
  className?: string;
  alt?: string;
};

/**
 * Placeholder SVG - a simple greyscale music note symbol
 */
const MusicNotePlaceholder: FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 64 64"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <g transform="translate(0,-1022.3622)">
      <path
        style={{
          color: "#000000",
          fill: "#64748b",
          stroke: "#64748b",
          strokeWidth: "1.02777779",
          strokeOpacity: 1,
        }}
        d="m 29.170673,16.56851 a 14.008413,14.008413 0 1 1 -28.0168263,0 14.008413,14.008413 0 1 1 28.0168263,0 z"
        transform="matrix(0.97297297,0,0,0.97297297,330.50795,953.63241)"
      />
      <path
        style={{
          fill: "#64748b",
          stroke: "#64748b",
          strokeWidth: "1px",
          strokeLinecap: "butt",
          strokeLinejoin: "miter",
          strokeOpacity: 1,
        }}
        d="m 345.29648,957.89011 0,11.863 0,0"
      />
      <path
        style={{
          fill: "#64748b",
          stroke: "#64748b",
          strokeWidth: "1px",
          strokeLinecap: "butt",
          strokeLinejoin: "miter",
          strokeOpacity: 1,
        }}
        d="m 357.15947,969.75311 -1.70877,0 0,0"
      />
      <path
        style={{
          fill: "#64748b",
          stroke: "#64748b",
          strokeWidth: "0.99999994px",
          strokeLinecap: "butt",
          strokeLinejoin: "miter",
          strokeOpacity: 1,
        }}
        d="m 345.29648,981.61611 0,-2.0181 0,0"
      />
      <path
        style={{
          fill: "#64748b",
          stroke: "#64748b",
          strokeWidth: "1px",
          strokeLinecap: "butt",
          strokeLinejoin: "miter",
          strokeOpacity: 1,
        }}
        d="m 333.43348,969.75311 11.863,0 0,0"
      />
      <path
        d="m 14.999994,1025.9915 -11.2422196,9.9235 2.2484301,0 0,12.8177 6.7453475,0 0,-7.5644 4.651059,0 1.3e-5,7.5644 6.591159,0 0,-12.8177 2.248444,0 -11.242237,-9.9235 0,0 0,0 z"
        style={{ fontSize: "12px", fill: "none", stroke: "none" }}
      />
      <path
        style={{
          fill: "#64748b",
          fillOpacity: 1,
          stroke: "none",
        }}
        d="m 23.786475,1024.6758 c -0.40128,0.017 -0.82113,0.127 -1.14315,0.2582 l -10.92359,4.3328 c -0.65101,0.4085 -1.04868,0.9851 -0.95877,1.8874 l 0,10.7577 c -0.50459,-0.212 -1.05937,-0.3303 -1.64097,-0.3303 -2.34136,0 -4.23902,1.8994 -4.23902,4.2407 0,2.3416 1.89766,4.2392 4.23902,4.2392 2.17558,0 3.96756,-1.6392 4.21054,-3.7496 l 0.12236,-14.8498 9.00438,-3.5886 0,9.5373 c -0.49603,-0.2036 -1.03974,-0.3167 -1.60912,-0.3167 -2.34137,0 -4.23903,1.8994 -4.23903,4.2407 0,2.3414 1.89766,4.239 4.23903,4.239 2.27777,0 4.13641,-1.7964 4.23567,-4.0497 0.003,0 0.0352,-0.017 0.0352,-0.017 l 0,-0.8967 -0.0318,-14.5123 c -0.0166,-1.1309 -0.63191,-1.4443 -1.3007,-1.4349 z"
      />
    </g>
  </svg>
);

/**
 * Get the thumbnail URL for a cover art ID and size
 */
const getCoverArtUrl = (coverArtId: string, size: number): string => {
  return `/api/cover-art/${coverArtId}/thumbnail/${size}`;
};

/**
 * CoverArt component for displaying cover art images with fallback to minimalistic music note placeholder
 */
export const CoverArt: FC<CoverArtProps> = ({
  coverArtId,
  size = 1024,
  className,
  alt = "Cover art",
}) => {
  const [hasError, setHasError] = useState(false);
  const imageUrl = useMemo(
    () => (coverArtId ? getCoverArtUrl(coverArtId, size) : null),
    [coverArtId, size],
  );

  // Show placeholder if no cover art ID or image failed to load
  if (!imageUrl || hasError) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ width: className ? "inherit" : "100%", height: className ? "inherit" : "100%" }}
      >
        <MusicNotePlaceholder className={className} />
      </div>
    );
  }

  return <img src={imageUrl} alt={alt} className={className} onError={() => setHasError(true)} />;
};

export default CoverArt;
