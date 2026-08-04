/**
 * Type definitions for the MediaSession API
 * Used to provide TypeScript support for OS-level media controls
 *
 * Ref: https://developer.mozilla.org/en-US/docs/Web/API/MediaSession
 */

interface MediaMetadataInit {
  title: string;
  artist?: string;
  album?: string;
  artwork?: MediaImage[];
}

interface MediaImage {
  src: string;
  sizes?: string;
  type?: string;
}

type MediaSessionPlaybackState = "none" | "paused" | "playing";

type MediaSessionAction =
  | "play"
  | "pause"
  | "seekbackward"
  | "seekforward"
  | "previoustrack"
  | "nexttrack"
  | "skipad"
  | "seek"
  | "seekto"
  | "togglecaptions";

interface MediaSessionActionDetails {
  action: MediaSessionAction;
  seekTime?: number;
  fastSeek?: boolean;
}

interface MediaSessionActionHandler {
  (details: MediaSessionActionDetails): void;
}

declare global {
  interface Navigator {
    mediaSession?: MediaSession;
  }

  class MediaMetadata {
    constructor(init?: MediaMetadataInit);
    metadata?: MediaMetadataInit;
  }

  interface MediaSession {
    metadata: MediaMetadata | null;
    playbackState: MediaSessionPlaybackState;
    setActionHandler(action: MediaSessionAction, handler: MediaSessionActionHandler | null): void;
  }
}

export {};
