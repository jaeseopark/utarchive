import { useEffect, useRef, useCallback, useState } from "react";
import { WebSocketMessage } from "../types/websocket";

export interface UseWebSocketOptions {
  onMessage?: (message: WebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
  autoConnect?: boolean;
}

const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const RECONNECT_DELAYS = [1000, 2000, 5000, 10000, 30000]; // milliseconds

/**
 * Hook for managing WebSocket connection with reconnection logic and heartbeat
 */
export const useWebSocket = ({
  onMessage,
  onConnect,
  onDisconnect,
  onError,
  autoConnect = true,
}: UseWebSocketOptions) => {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const clearHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const startHeartbeat = useCallback(() => {
    clearHeartbeat();
    heartbeatIntervalRef.current = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        try {
          wsRef.current.send(
            JSON.stringify({
              type: "PING",
              timestamp: Date.now(),
            })
          );
        } catch (err) {
          console.error("[WebSocket] Failed to send heartbeat:", err);
        }
      }
    }, HEARTBEAT_INTERVAL);
  }, [clearHeartbeat]);

  const connect = useCallback(async () => {
    if (isConnecting || isConnected) {
      return;
    }

    setIsConnecting(true);

    try {
      // Get JWT token from localStorage or session
      const token = localStorage.getItem("authToken");
      if (!token) {
        throw new Error("No authentication token available");
      }

      // Determine WebSocket URL (ws or wss based on protocol)
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/ws?token=${encodeURIComponent(token)}`;

      console.log("[WebSocket] Connecting to", wsUrl.replace(token, "***"));

      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log("[WebSocket] Connected");
        reconnectAttemptRef.current = 0;
        setIsConnected(true);
        setIsConnecting(false);
        startHeartbeat();
        onConnect?.();
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage;
          onMessage?.(message);
        } catch (err) {
          console.error("[WebSocket] Failed to parse message:", err);
          onError?.(new Error("Failed to parse WebSocket message"));
        }
      };

      ws.onerror = (event) => {
        console.error("[WebSocket] Connection error:", event);
        onError?.(new Error("WebSocket connection error"));
      };

      ws.onclose = () => {
        console.log("[WebSocket] Disconnected");
        clearHeartbeat();
        setIsConnected(false);
        setIsConnecting(false);
        onDisconnect?.();

        // Attempt to reconnect
        reconnect();
      };

      wsRef.current = ws;
    } catch (err) {
      console.error("[WebSocket] Connection failed:", err);
      const error = err instanceof Error ? err : new Error("Unknown error");
      onError?.(error);
      setIsConnecting(false);

      // Attempt to reconnect
      reconnect();
    }
  }, [isConnecting, isConnected, onConnect, onDisconnect, onError, onMessage, startHeartbeat, clearHeartbeat]);

  const reconnect = useCallback(() => {
    clearReconnectTimeout();

    const delay = RECONNECT_DELAYS[
      Math.min(reconnectAttemptRef.current, RECONNECT_DELAYS.length - 1)
    ];
    reconnectAttemptRef.current++;

    console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${reconnectAttemptRef.current})`);

    reconnectTimeoutRef.current = setTimeout(() => {
      connect();
    }, delay);
  }, [connect, clearReconnectTimeout]);

  const disconnect = useCallback(() => {
    clearHeartbeat();
    clearReconnectTimeout();

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnected(false);
    setIsConnecting(false);
  }, [clearHeartbeat, clearReconnectTimeout]);

  const send = useCallback((message: WebSocketMessage) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn("[WebSocket] Cannot send message: connection not open");
    }
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect]); // Only run on mount/unmount

  return {
    isConnected,
    isConnecting,
    connect,
    disconnect,
    send,
  };
};
