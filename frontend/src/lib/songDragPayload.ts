import { toBrandId, type SongId } from "../types/brands";

export const SONG_IDS_DRAG_MIME = "application/x-utarchive-song-ids";

interface SongDragPayload {
  songIds: string[];
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isSongDragPayload(value: unknown): value is SongDragPayload {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  if (!("songIds" in value)) {
    return false;
  }

  const songIds = value.songIds;
  if (!Array.isArray(songIds)) {
    return false;
  }

  return songIds.every((id) => typeof id === "string" && UUID_RE.test(id));
}

export function serializeDraggedSongIds(songIds: SongId[]): string {
  return JSON.stringify({ songIds });
}

export function parseDraggedSongIds(raw: string): SongId[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isSongDragPayload(parsed)) {
      return [];
    }

    return parsed.songIds.map((id) => toBrandId<SongId>(id));
  } catch {
    return [];
  }
}
