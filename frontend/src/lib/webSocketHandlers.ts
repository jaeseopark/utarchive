import { DataChangedMessage, UserConfigChangedMessage } from "../types/websocket";
import { isOwnRequest } from "./requestIdDeduplication";
import { useSongsStore } from "../stores/useSongsStore";
import { useAlbumsStore } from "../stores/useAlbumsStore";
import { useArtistsStore } from "../stores/useArtistsStore";
import { usePlaylistsStore } from "../stores/usePlaylistsStore";
import { useNotificationStore } from "../stores/useNotificationStore";
import { useUserConfigStore } from "../stores/useUserConfigStore";
import {
  toBrandId,
  type SongId,
  type AlbumId,
  type ArtistId,
  type PlaylistId,
} from "../types/brands";

/**
 * Helper function to call the appropriate store method based on entity type and action
 */
const updateStoreByAction = (
  entity: string,
  action: "created" | "updated" | "deleted",
  items: Array<Record<string, unknown>>,
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
          useSongsStore.getState().updateSong(toBrandId<SongId>(id), item as never);
        } else if (action === "deleted") {
          useSongsStore.getState().removeSong(toBrandId<SongId>(id));
        }
        break;
      case "album":
        if (action === "created") {
          // eslint-disable-next-line no-restricted-syntax
          useAlbumsStore.getState().addAlbum(item as never);
        } else if (action === "updated") {
          // eslint-disable-next-line no-restricted-syntax
          useAlbumsStore.getState().updateAlbum(toBrandId<AlbumId>(id), item as never);
        } else if (action === "deleted") {
          useAlbumsStore.getState().removeAlbum(toBrandId<AlbumId>(id));
        }
        break;
      case "artist":
        if (action === "created") {
          // eslint-disable-next-line no-restricted-syntax
          useArtistsStore.getState().addArtist(item as never);
        } else if (action === "updated") {
          // eslint-disable-next-line no-restricted-syntax
          useArtistsStore.getState().updateArtist(toBrandId<ArtistId>(id), item as never);
        } else if (action === "deleted") {
          useArtistsStore.getState().removeArtist(toBrandId<ArtistId>(id));
        }
        break;
      case "playlist":
        if (action === "created") {
          // eslint-disable-next-line no-restricted-syntax
          usePlaylistsStore.getState().addPlaylist(item as never);
        } else if (action === "updated") {
          usePlaylistsStore
            .getState()
            // eslint-disable-next-line no-restricted-syntax
            .updatePlaylistFromRemote(toBrandId<PlaylistId>(id), item as never);
        } else if (action === "deleted") {
          usePlaylistsStore.getState().removePlaylistFromRemote(toBrandId<PlaylistId>(id));
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

/**
 * Enqueue a notification from WebSocket handler
 * Pattern established for future server-pushed notifications
 */
export const handleWebSocketNotification = (
  type: "error" | "success" | "info" | "warning",
  message: string,
): void => {
  useNotificationStore.getState().addNotification({
    type,
    message,
  });
};

/**
 * Handles user config change messages from other tabs/clients
 * Applies the config locally without making an API call (prevents infinite loops)
 */
export const handleUserConfigChanged = (message: UserConfigChangedMessage): void => {
  if (!message.data || typeof message.data !== "object" || !("config" in message.data)) {
    console.warn("[WebSocket] Invalid user config change message:", message);
    return;
  }

  const data = message.data;
  if (!("config" in data)) {
    console.warn("[WebSocket] Invalid user config change message:", message);
    return;
  }

  const config = data.config;
  if (typeof config !== "object" || config === null) {
    console.warn("[WebSocket] Invalid config in user config change message:", message);
    return;
  }

  // Apply config locally without triggering an API call
  useUserConfigStore.getState().applyConfigLocally(config);
};
