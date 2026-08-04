import { useEffect } from "react";
import { useWebSocketContext } from "../context/WebSocketContext";
import { handleDataChanged, handleUserConfigChanged } from "../lib/webSocketHandlers";
import {
  DataChangedMessage,
  UserConfigChangedMessage,
  WebSocketMessage,
  AudioIngestionStatusMessage,
} from "../types/websocket";
import { useNotificationStore } from "../stores/useNotificationStore";
import { startRequestIdCleanup, stopRequestIdCleanup } from "../lib/requestIdDeduplication";
import {
  logConnection,
  logMessageReceived,
  logError,
  logStateUpdate,
} from "../lib/webSocketLogger";

/**
 * Hook to initialize WebSocket message handlers
 * Should be used in a component that wraps the app (e.g., in main.tsx or a root component)
 */
export const useWebSocketMessageHandling = () => {
  const { isConnected } = useWebSocketContext();

  // Initialize message handlers and cleanup
  useEffect(() => {
    // Start the request ID cleanup interval
    startRequestIdCleanup();

    return () => {
      // Stop cleanup on unmount
      stopRequestIdCleanup();
    };
  }, []);

  // Log connection status changes
  useEffect(() => {
    if (isConnected) {
      logConnection("connected");
    } else {
      logConnection("disconnected");
    }
  }, [isConnected]);
};

/**
 * Hook to handle WebSocket messages in a component
 * Automatically handles different message types and updates stores
 */
export const useWebSocketMessages = (onMessage?: (message: WebSocketMessage) => void) => {
  useEffect(() => {
    // This is handled at the context level, but this hook allows
    // components to react to message events if needed
  }, [onMessage]);
};

/**
 * Type guard to check if a WebSocketMessage is a DataChangedMessage
 */
function isDataChangedMessage(message: WebSocketMessage): message is DataChangedMessage {
  return message.type === "DATA_CHANGED";
}

/**
 * Type guard to check if a WebSocketMessage is a UserConfigChangedMessage
 */
function isUserConfigChangedMessage(
  message: WebSocketMessage,
): message is UserConfigChangedMessage {
  return message.type === "USER_CONFIG_CHANGED";
}

/**
 * Type guard to check if a WebSocketMessage is an AudioIngestionStatusMessage
 */
function isAudioIngestionStatusMessage(
  message: WebSocketMessage,
): message is AudioIngestionStatusMessage {
  return message.type === "AUDIO_INGESTION_STATUS";
}

/**
 * Helper to safely extract string ID from an item
 */
function getId(item: Record<string, unknown>): string | undefined {
  const id = item.id;
  return typeof id === "string" ? id : undefined;
}

/**
 * Handler for audio ingestion status messages
 * Displays toast notifications based on ingestion status
 */
function handleAudioIngestionStatus(message: AudioIngestionStatusMessage): void {
  const addNotification = useNotificationStore.getState().addNotification;
  const { filename, status, error, duration } = message.data;

  switch (status) {
    case "success": {
      const durationStr = duration ? ` (${duration.toFixed(1)}s)` : "";
      addNotification({ type: "success", message: `✅ Added: ${filename}${durationStr}` });
      break;
    }

    case "skipped": {
      addNotification({ type: "info", message: `⏭️ Already in library: ${filename}` });
      break;
    }

    case "timeout": {
      addNotification({ type: "error", message: `⏱️ Transfer timeout: ${filename}` });
      break;
    }

    case "error": {
      const errorMsg = error ? ` — ${error}` : "";
      addNotification({ type: "error", message: `❌ Failed: ${filename}${errorMsg}` });
      break;
    }

    default: {
      console.warn("[WebSocket] Unknown ingestion status:", status);
    }
  }
}

/**
 * Function to be passed to WebSocketProvider's onMessage prop
 * Handles routing messages to appropriate handlers
 */
export const handleWebSocketMessage = (message: WebSocketMessage): void => {
  try {
    logMessageReceived(message);

    switch (message.type) {
      case "DATA_CHANGED": {
        if (isDataChangedMessage(message)) {
          handleDataChanged(message);
          const dataMsg = message;

          // Log each action type separately
          dataMsg.data.created?.forEach((item: Record<string, unknown>) => {
            const id = getId(item);
            if (id) {
              logStateUpdate(dataMsg.entity, "add", id);
            }
          });
          dataMsg.data.updated?.forEach((item: Record<string, unknown>) => {
            const id = getId(item);
            if (id) {
              logStateUpdate(dataMsg.entity, "update", id);
            }
          });
          dataMsg.data.deleted?.forEach((item: Record<string, unknown>) => {
            const id = getId(item);
            if (id) {
              logStateUpdate(dataMsg.entity, "delete", id);
            }
          });
        }
        break;
      }

      case "PONG": {
        // Heartbeat response - no action needed
        break;
      }

      case "CONNECTED": {
        // Server confirmation of connection - no action needed
        break;
      }

      case "ERROR": {
        console.error("[WebSocket] Server error:", message.error);
        logError(message.error || "Unknown error");
        break;
      }

      case "USER_CONFIG_CHANGED": {
        if (isUserConfigChangedMessage(message)) {
          handleUserConfigChanged(message);
        }
        break;
      }

      case "AUDIO_INGESTION_STATUS": {
        if (isAudioIngestionStatusMessage(message)) {
          handleAudioIngestionStatus(message);
        }
        break;
      }

      default: {
        console.warn("[WebSocket] Unknown message type:", message.type);
      }
    }
  } catch (err) {
    console.error("[WebSocket] Error handling message:", err);
    logError(err instanceof Error ? err : String(err));
  }
};
