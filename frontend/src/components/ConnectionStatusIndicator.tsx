import React from "react";
import { useWebSocketContext } from "../context/WebSocketContext";

/**
 * Component to display WebSocket connection status
 * Shows a visual indicator in the UI (top-right corner by default)
 */
export const ConnectionStatusIndicator: React.FC = () => {
  const { isConnected, isConnecting } = useWebSocketContext();

  if (isConnected) {
    return (
      <div
        className="flex items-center gap-2 px-3 py-2 bg-green-100 text-green-800 rounded-md text-sm font-medium"
        title="Connected to server"
      >
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        <span className="hidden sm:inline">Connected</span>
      </div>
    );
  }

  if (isConnecting) {
    return (
      <div
        className="flex items-center gap-2 px-3 py-2 bg-yellow-100 text-yellow-800 rounded-md text-sm font-medium"
        title="Connecting to server..."
      >
        <div className="w-2 h-2 bg-yellow-500 rounded-full animate-spin" />
        <span className="hidden sm:inline">Connecting...</span>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-2 px-3 py-2 bg-red-100 text-red-800 rounded-md text-sm font-medium"
      title="Disconnected from server"
    >
      <div className="w-2 h-2 bg-red-500 rounded-full" />
      <span className="hidden sm:inline">Offline</span>
    </div>
  );
};
