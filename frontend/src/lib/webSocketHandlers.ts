import { DataChangedMessage } from "../types/websocket";
import { isOwnRequest } from "./requestIdDeduplication";
import { useSongsStore } from "../stores/useSongsStore";
import { useAlbumsStore } from "../stores/useAlbumsStore";
import { useArtistsStore } from "../stores/useArtistsStore";
import { usePlaylistsStore } from "../stores/usePlaylistsStore";
import { createSongId, createAlbumId, createArtistId, createPlaylistId } from "../types/brands";

/**
 * Helper function to call the appropriate store method based on entity type and action
 */
const updateStoreByAction = (
  entity: string,
  action: "created" | "updated" | "deleted",
  items: Array<Record<string, unknown>>
) => {
  items.forEach((item) => {
    // Validate id is a string
    if (typeof item.id !== "string") {
      console.warn(`[WebSocket] Item missing or invalid id for ${entity}`);
      return;
    }
    const id = item.id;

    switch (entity) {
      case "song":
        if (action === "created") {
          // eslint-disable-next-line no-restricted-syntax
          useSongsStore.getState().addSong(item as never);
        } else if (action === "updated") {
          // eslint-disable-next-line no-restricted-syntax
          useSongsStore.getState().updateSong(createSongId(id), item as never);
        } else if (action === "deleted") {
          useSongsStore.getState().removeSong(createSongId(id));
        }
        break;
      case "album":
        if (action === "created") {
          // eslint-disable-next-line no-restricted-syntax
          useAlbumsStore.getState().addAlbum(item as never);
        } else if (action === "updated") {
          // eslint-disable-next-line no-restricted-syntax
          useAlbumsStore.getState().updateAlbum(createAlbumId(id), item as never);
        } else if (action === "deleted") {
          useAlbumsStore.getState().removeAlbum(createAlbumId(id));
        }
        break;
      case "artist":
        if (action === "created") {
          // eslint-disable-next-line no-restricted-syntax
          useArtistsStore.getState().addArtist(item as never);
        } else if (action === "updated") {
          // eslint-disable-next-line no-restricted-syntax
          useArtistsStore.getState().updateArtist(createArtistId(id), item as never);
        } else if (action === "deleted") {
          useArtistsStore.getState().removeArtist(createArtistId(id));
        }
        break;
      case "playlist":
        if (action === "created") {
          // eslint-disable-next-line no-restricted-syntax
          usePlaylistsStore.getState().addPlaylist(item as never);
        } else if (action === "updated") {
          // eslint-disable-next-line no-restricted-syntax
          usePlaylistsStore.getState().updatePlaylistFromRemote(createPlaylistId(id), item as never);
        } else if (action === "deleted") {
          usePlaylistsStore.getState().removePlaylistFromRemote(createPlaylistId(id));
        }
        break;
      default:
        console.warn(`[WebSocket] Unhandled entity type: ${entity}`);
    }
  });
};

/**
 * Handles data change messages (consolidated handler for all entity changes)
 * Processes: deleted → updated → created (to avoid conflicts)
 */
export const handleDataChanged = (message: DataChangedMessage): void => {
  // Skip if this client initiated the change
  if (isOwnRequest(message.requestId)) {
    return;
  }

  const { entity, data } = message;

  // Process deletions first
  if (data.deleted && data.deleted.length > 0) {
    updateStoreByAction(entity, "deleted", data.deleted);
  }

  // Process updates second
  if (data.updated && data.updated.length > 0) {
    updateStoreByAction(entity, "updated", data.updated);
  }

  // Process creations last
  if (data.created && data.created.length > 0) {
    updateStoreByAction(entity, "created", data.created);
  }
};
