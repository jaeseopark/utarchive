import { useEffect, useRef, useCallback, useState } from "react";
import { WebSocketMessage } from "../types/websocket";
import { useSession } from "../context/SessionContext";

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
  const autoConnectInitializedRef = useRef(false);
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
      // Determine WebSocket URL (ws or wss based on protocol)
      // Note: Session cookie will be sent automatically by the browser
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const hostname = window.location.hostname;
      
      // In development, frontend runs on 5173, backend on 3000
      // In production, both are on same origin (usually proxied)
      const port = window.location.port === "5173" ? "3000" : window.location.port || "";
      const hostWithPort = port ? `${hostname}:${port}` : hostname;
      
      const wsUrl = `${protocol}//${hostWithPort}/ws`;

      console.log("[WebSocket] Connecting to", wsUrl);

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

        // Attempt to reconnect only if we had been connected before
        // This prevents reconnection loops when user is not authenticated
        if (reconnectAttemptRef.current > 0) {
          reconnect();
        }
      };

      wsRef.current = ws;
    } catch (err) {
      console.error("[WebSocket] Connection failed:", err);
      const error = err instanceof Error ? err : new Error("Unknown error");
      onError?.(error);
      setIsConnecting(false);
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

  const { user, isLoading: isSessionLoading } = useSession();

  // Auto-connect on mount and when authentication state changes
  useEffect(() => {
    // If not authenticated or session still loading, reset and disconnect
    if (!user || isSessionLoading) {
      autoConnectInitializedRef.current = false;
      // Close WebSocket if it exists
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      clearHeartbeat();
      clearReconnectTimeout();
      setIsConnected(false);
      setIsConnecting(false);
      return;
    }

    // Only initialize connection once per authenticated session
    if (autoConnect && !autoConnectInitializedRef.current) {
      autoConnectInitializedRef.current = true;
      connect();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoConnect, user, isSessionLoading]);

  return {
    isConnected,
    isConnecting,
    connect,
    disconnect,
    send,
  };
};
