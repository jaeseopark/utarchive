import React, { createContext, useContext, ReactNode } from "react";
import { useWebSocket, UseWebSocketOptions } from "../hooks/useWebSocket";
import { WebSocketMessage } from "../types/websocket";

interface WebSocketContextType {
  isConnected: boolean;
  isConnecting: boolean;
  send: (message: WebSocketMessage) => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

interface WebSocketProviderProps extends UseWebSocketOptions {
  children: ReactNode;
}

/**
 * Provider for WebSocket connection management
 * Wraps the application to provide global WebSocket access
 */
export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({
  children,
  onMessage,
  onConnect,
  onDisconnect,
  onError,
}) => {
  const { isConnected, isConnecting, send } = useWebSocket({
    onMessage,
    onConnect,
    onDisconnect,
    onError,
    autoConnect: true,
  });

  return (
    <WebSocketContext.Provider value={{ isConnected, isConnecting, send }}>
      {children}
    </WebSocketContext.Provider>
  );
};

/**
 * Hook to access WebSocket context
 */
export const useWebSocketContext = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error("useWebSocketContext must be used within WebSocketProvider");
  }
  return context;
};
