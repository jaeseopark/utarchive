import { WebSocketMessage } from "../types/websocket";

/**
 * WebSocket event logger for monitoring and debugging
 */

interface WebSocketEvent {
  timestamp: number;
  type: string;
  userId?: string;
  message?: string;
  duration?: number;
  error?: string;
}

const events: WebSocketEvent[] = [];
const MAX_EVENTS = 1000;

/**
 * Log a WebSocket event
 */
export const logWebSocketEvent = (event: Omit<WebSocketEvent, "timestamp">): void => {
  const logEntry: WebSocketEvent = {
    timestamp: Date.now(),
    ...event,
  };

  events.push(logEntry);

  // Keep only the most recent MAX_EVENTS
  if (events.length > MAX_EVENTS) {
    events.shift();
  }

  // Also log to console in development
  if (process.env.NODE_ENV === "development") {
    console.log(`[WebSocket Event] ${event.type}`, {
      userId: event.userId,
      message: event.message,
      duration: event.duration,
      error: event.error,
    });
  }
};

/**
 * Log a message broadcast
 */
export const logBroadcast = (
  userId: string | undefined,
  message: WebSocketMessage,
  clientCount: number,
): void => {
  logWebSocketEvent({
    type: "BROADCAST",
    userId,
    message: `Broadcast ${message.type} to ${clientCount} clients`,
  });
};

/**
 * Log a connection event
 */
export const logConnection = (userId: string, event: "connected" | "disconnected"): void => {
  logWebSocketEvent({
    type: event === "connected" ? "CONNECTION" : "DISCONNECTION",
    userId,
    message: `Client ${event}`,
  });
};

/**
 * Log a message send
 */
export const logMessageSend = (userId: string, messageType: string): void => {
  logWebSocketEvent({
    type: "MESSAGE_SEND",
    userId,
    message: `Sent ${messageType}`,
  });
};

/**
 * Log an error
 */
export const logError = (userId: string | undefined, error: Error | string): void => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  logWebSocketEvent({
    type: "ERROR",
    userId,
    error: errorMessage,
  });
};

/**
 * Get recent events (for monitoring)
 */
export const getRecentEvents = (limit = 100): WebSocketEvent[] => {
  return events.slice(-limit);
};

/**
 * Get event statistics
 */
export const getEventStats = () => {
  const stats = {
    totalEvents: events.length,
    connections: events.filter((e) => e.type === "CONNECTION").length,
    disconnections: events.filter((e) => e.type === "DISCONNECTION").length,
    broadcasts: events.filter((e) => e.type === "BROADCAST").length,
    errors: events.filter((e) => e.type === "ERROR").length,
  };

  return stats;
};

/**
 * Clear all events
 */
export const clearEvents = (): void => {
  events.length = 0;
};
