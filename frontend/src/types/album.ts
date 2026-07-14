import { type SongId } from "./brands";

/**
 * A track can be either:
 * 1. A reference to an existing song via its ID
 * 2. A literal track entry with metadata
 */
export type Track =
  | {
      songId: SongId;
    }
  | {
      title: string;
      artists?: string;
      duration?: number; // in seconds
    };

/**
 * A numbered track is a Track with an associated track number
 */
export type NumberedTrack = Track & {
  trackNumber: number;
};

/**
 * Type guard to check if a track has a songId reference
 */
export function hasSongId(track: Track): track is { songId: SongId } {
  return "songId" in track;
}

/**
 * Type guard to check if a track is a literal track entry
 */
export function isLiteralTrack(track: Track): track is {
  title: string;
  artists?: string;
  duration?: number;
} {
  return "title" in track;
}
