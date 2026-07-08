import { WebSocket } from "ws";

export type EntityType = "song" | "album" | "artist" | "playlist" | "coverArt";

export type MessageType =
  | "DATA_CHANGED"
  | "PING"
  | "PONG"
  | "CONNECTED"
  | "ERROR";

export interface WebSocketMessage {
  type: MessageType;
  entity?: EntityType;
  timestamp: number;
  data?: unknown;
  requestId?: string;
  error?: string;
}

export interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  isAlive?: boolean;
}

// Specific message type interfaces
export interface DataChangedMessage extends WebSocketMessage {
  type: "DATA_CHANGED";
  entity: EntityType;
  data: {
    created?: Array<Record<string, unknown>>;
    updated?: Array<Record<string, unknown>>;
    deleted?: Array<{ id: string }>;
  };
  requestId?: string;
}

export interface PingMessage extends WebSocketMessage {
  type: "PING";
}

export interface PongMessage extends WebSocketMessage {
  type: "PONG";
}

export interface ConnectedMessage extends WebSocketMessage {
  type: "CONNECTED";
}

export interface ErrorMessage extends WebSocketMessage {
  type: "ERROR";
  error: string;
}
