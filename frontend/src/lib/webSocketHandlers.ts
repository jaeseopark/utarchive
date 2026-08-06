import { DataChangedMessage, UserConfigChangedMessage } from "../types/websocket";
import { currentOriginId } from "../api/client";
import { useNotificationStore } from "../stores/useNotificationStore";
import { useUserConfigStore } from "../stores/useUserConfigStore";
import { toBrandId } from "types";
import { getStoreForEntity, isSupportedEntityType } from "./entityStoreMapping";

/**
 * Processes created items for an entity store.
 * Adds items to store and invokes listeners if event originated from current client.
 *
 * @param store The entity store to add items to
 * @param items The items that were created
 * @param isOwnOrigin Whether this event originated from the current client
 */
const handleCreatedAction = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  store: any,
  items: Array<Record<string, unknown>> | undefined,
  isOwnOrigin: boolean,
): void => {
  // Gracefully handle empty arrays
  if (!items || items.length === 0) {
    return;
  }

  items.forEach((item) => {
    // Validate id is a string
    if (typeof item.id !== "string") {
      console.warn("[WebSocket] Item missing or invalid id");
      return;
    }

    const id = toBrandId(item.id);

    store.add({ item });
    // If this entity was created by our own tab, invoke listeners after updating store
    // so the data is available for components that might navigate or update views
    if (isOwnOrigin) {
      const listeners = store.getListeners('created');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      listeners.forEach((listener: any) => {
        try {
          listener(id);
        } catch (error) {
          console.error("[WebSocket] Error in created listener:", error);
        }
      });
    }
  });
};

/**
 * Processes updated items for an entity store.
 * Updates items in store and invokes listeners if event originated from current client.
 *
 * @param store The entity store to update items in
 * @param items The items that were updated
 * @param isOwnOrigin Whether this event originated from the current client
 */
const handleUpdatedAction = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  store: any,
  items: Array<Record<string, unknown>> | undefined,
  isOwnOrigin: boolean,
): void => {
  // Gracefully handle empty arrays
  if (!items || items.length === 0) {
    return;
  }

  items.forEach((item) => {
    // Validate id is a string
    if (typeof item.id !== "string") {
      console.warn("[WebSocket] Item missing or invalid id");
      return;
    }

    const id = toBrandId(item.id);

    store.update({ id, updates: item });
    // If this entity was updated by our own tab, invoke listeners after updating store
    // so the latest data is available for components that might refresh views
    if (isOwnOrigin) {
      const listeners = store.getListeners('updated');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      listeners.forEach((listener: any) => {
        try {
          listener(id);
        } catch (error) {
          console.error("[WebSocket] Error in updated listener:", error);
        }
      });
    }
  });
};

/**
 * Processes deleted items for an entity store.
 * Removes items from store and invokes listeners if event originated from current client.
 *
 * @param store The entity store to remove items from
 * @param items The items that were deleted
 * @param isOwnOrigin Whether this event originated from the current client
 */
const handleDeletedAction = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  store: any,
  items: Array<Record<string, unknown>> | undefined,
  isOwnOrigin: boolean,
): void => {
  // Gracefully handle empty arrays
  if (!items || items.length === 0) {
    return;
  }

  items.forEach((item) => {
    // Validate id is a string
    if (typeof item.id !== "string") {
      console.warn("[WebSocket] Item missing or invalid id");
      return;
    }

    const id = toBrandId(item.id);

    store.remove({ id });
    // If this entity was deleted by our own tab, invoke listeners after removing from store
    // so components can know it's been removed before doing cleanup
    if (isOwnOrigin) {
      const listeners = store.getListeners('deleted');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      listeners.forEach((listener: any) => {
        try {
          listener(id);
        } catch (error) {
          console.error("[WebSocket] Error in deleted listener:", error);
        }
      });
    }
  });
};

/**
 * Handles data change messages (consolidated handler for all entity changes)
 * Processes: deleted → updated → created (to avoid conflicts)
 * Note: Deletions are always processed even if they're from own requests,
 * since store updates happen only via WebSocket, not HTTP response
 */
export const handleDataChanged = (message: DataChangedMessage): void => {
  const { entity, data } = message;

  // Validate entity type is supported before processing
  if (!isSupportedEntityType(entity)) {
    console.warn(`[WebSocket] Unhandled entity type: ${entity}`);
    return;
  }

  try {
    const store = getStoreForEntity(entity);

    // Determine if this event originated from the current client
    const isOwnOrigin = message.originId === currentOriginId;

    // Process deletions first - always process (store update only from WebSocket)
    handleDeletedAction(store, data.deleted, isOwnOrigin);

    // Process updates second
    handleUpdatedAction(store, data.updated, isOwnOrigin);

    // Process creations last
    handleCreatedAction(store, data.created, isOwnOrigin);
  } catch (error) {
    if (error instanceof Error) {
      console.warn(`[WebSocket] Error processing ${entity} data:`, error.message);
    } else {
      console.warn(`[WebSocket] Error processing ${entity} data:`, error);
    }
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
