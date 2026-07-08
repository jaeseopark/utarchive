import { DataChangedMessage } from "../types/websocket";
import { isOwnRequest } from "./requestIdDeduplication";
import { useSongsStore } from "../stores/useSongsStore";
import { useAlbumsStore } from "../stores/useAlbumsStore";
import { useArtistsStore } from "../stores/useArtistsStore";
import { usePlaylistsStore } from "../stores/usePlaylistsStore";

/**
 * Helper function to call the appropriate store method based on entity type and action
 */
const updateStoreByAction = (
  entity: string,
  action: "created" | "updated" | "deleted",
  items: Array<Record<string, unknown>>
) => {
  items.forEach((item) => {
    const id = (item as any).id;

    switch (entity) {
      case "song":
        if (action === "created") {
          useSongsStore.getState().addSong(item as any);
        } else if (action === "updated") {
          useSongsStore.getState().updateSong(id, item as any);
        } else if (action === "deleted") {
          useSongsStore.getState().removeSong(id);
        }
        break;
      case "album":
        if (action === "created") {
          useAlbumsStore.getState().addAlbum(item as any);
        } else if (action === "updated") {
          useAlbumsStore.getState().updateAlbum(id, item as any);
        } else if (action === "deleted") {
          useAlbumsStore.getState().removeAlbum(id);
        }
        break;
      case "artist":
        if (action === "created") {
          useArtistsStore.getState().addArtist(item as any);
        } else if (action === "updated") {
          useArtistsStore.getState().updateArtist(id, item as any);
        } else if (action === "deleted") {
          useArtistsStore.getState().removeArtist(id);
        }
        break;
      case "playlist":
        if (action === "created") {
          usePlaylistsStore.getState().addPlaylist(item as any);
        } else if (action === "updated") {
          usePlaylistsStore.getState().updatePlaylistFromRemote(id, item as any);
        } else if (action === "deleted") {
          usePlaylistsStore.getState().removePlaylistFromRemote(id);
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
