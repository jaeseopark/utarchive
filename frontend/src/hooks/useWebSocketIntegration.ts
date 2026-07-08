import { useEffect } from "react";
import { useWebSocketContext } from "../context/WebSocketContext";
import { handleDataChanged } from "../lib/webSocketHandlers";
import { DataChangedMessage, WebSocketMessage } from "../types/websocket";
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
 * Function to be passed to WebSocketProvider's onMessage prop
 * Handles routing messages to appropriate handlers
 */
export const handleWebSocketMessage = (message: WebSocketMessage): void => {
  try {
    logMessageReceived(message);

    switch (message.type) {
      case "DATA_CHANGED": {
        // eslint-disable-next-line no-restricted-syntax
        handleDataChanged(message as DataChangedMessage);
        // eslint-disable-next-line no-restricted-syntax
        const dataMsg = message as DataChangedMessage;
        
        // Log each action type separately
        dataMsg.data.created?.forEach((item: Record<string, unknown>) => {
          logStateUpdate(dataMsg.entity, "add", item.id as string);
        });
        dataMsg.data.updated?.forEach((item: Record<string, unknown>) => {
          logStateUpdate(dataMsg.entity, "update", item.id as string);
        });
        dataMsg.data.deleted?.forEach((item: Record<string, unknown>) => {
          logStateUpdate(dataMsg.entity, "delete", item.id as string);
        });
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

      default: {
        console.warn("[WebSocket] Unknown message type:", message.type);
      }
    }
  } catch (err) {
    console.error("[WebSocket] Error handling message:", err);
    logError(err instanceof Error ? err : String(err));
  }
};
