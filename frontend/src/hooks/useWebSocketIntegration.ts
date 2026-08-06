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
          handleDataChanged(message as DataChangedMessage);
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
        handleUserConfigChanged(message as UserConfigChangedMessage);
        break;
      }

      case "AUDIO_INGESTION_STATUS": {
        handleAudioIngestionStatus(message as AudioIngestionStatusMessage);
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
