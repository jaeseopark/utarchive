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
      case "DATA_CHANGED":
        handleDataChanged(message as DataChangedMessage);
        const dataMsg = message as DataChangedMessage;
        const changedIds = [
          ...(dataMsg.data.created?.map((i: any) => i.id) || []),
          ...(dataMsg.data.updated?.map((i: any) => i.id) || []),
          ...(dataMsg.data.deleted?.map((i: any) => i.id) || []),
        ];
        changedIds.forEach((id) => {
          logStateUpdate(dataMsg.entity, "changed", id);
        });
        break;

      case "PONG":
        // Heartbeat response - no action needed
        break;

      case "CONNECTED":
        // Server confirmation of connection - no action needed
        break;

      case "ERROR":
        console.error("[WebSocket] Server error:", message.error);
        logError(message.error || "Unknown error");
        break;

      default:
        console.warn("[WebSocket] Unknown message type:", (message as any).type);
    }
  } catch (err) {
    console.error("[WebSocket] Error handling message:", err);
    logError(err instanceof Error ? err : String(err));
  }
};
