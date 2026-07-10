import { WebSocketMessage } from "../types/websocket";

/**
 * Frontend WebSocket event logger for monitoring and debugging
 */

interface WebSocketEvent {
  timestamp: number;
  type: string;
  message?: string;
  duration?: number;
  error?: string;
  data?: unknown;
}

const events: WebSocketEvent[] = [];
const MAX_EVENTS = 500;

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

  // Log to console in development
  if (import.meta.env.DEV) {
    console.log(`[WebSocket Client] ${event.type}`, {
      message: event.message,
      duration: event.duration,
      error: event.error,
    });
  }
};

/**
 * Log a connection event
 */
export const logConnection = (event: "connected" | "connecting" | "disconnected"): void => {
  logWebSocketEvent({
    type: "CONNECTION",
    message: `Connection: ${event}`,
  });
};

/**
 * Log a message received
 */
export const logMessageReceived = (message: WebSocketMessage): void => {
  logWebSocketEvent({
    type: "MESSAGE_RECEIVED",
    message: `Received ${message.type}`,
    data: {
      entity: message.entity,
      requestId: message.requestId,
    },
  });
};

/**
 * Log a message sent
 */
export const logMessageSent = (message: WebSocketMessage): void => {
  logWebSocketEvent({
    type: "MESSAGE_SENT",
    message: `Sent ${message.type}`,
  });
};

/**
 * Log a reconnection attempt
 */
export const logReconnect = (attempt: number, delay: number): void => {
  logWebSocketEvent({
    type: "RECONNECT",
    message: `Attempt ${attempt} in ${delay}ms`,
  });
};

/**
 * Log an error
 */
export const logError = (error: Error | string): void => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  logWebSocketEvent({
    type: "ERROR",
    error: errorMessage,
  });
};

/**
 * Log state update
 */
export const logStateUpdate = (
  entity: string,
  action: "add" | "update" | "delete",
  id: string,
): void => {
  logWebSocketEvent({
    type: "STATE_UPDATE",
    message: `${action.toUpperCase()} ${entity} ${id}`,
  });
};

/**
 * Get recent events (for monitoring/debugging)
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
    messagesReceived: events.filter((e) => e.type === "MESSAGE_RECEIVED").length,
    messagesSent: events.filter((e) => e.type === "MESSAGE_SENT").length,
    reconnects: events.filter((e) => e.type === "RECONNECT").length,
    errors: events.filter((e) => e.type === "ERROR").length,
    stateUpdates: events.filter((e) => e.type === "STATE_UPDATE").length,
  };

  return stats;
};

/**
 * Clear all events
 */
export const clearEvents = (): void => {
  events.length = 0;
};

/**
 * Export events for debugging (e.g., to paste into console for analysis)
 */
export const exportEvents = (): string => {
  return JSON.stringify(events, null, 2);
};
