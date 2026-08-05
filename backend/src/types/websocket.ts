import { WebSocket } from "ws";
import { z } from "zod";

export type EntityType = "song" | "album" | "artist" | "playlist" | "coverArt";

export type MessageType =
  | "DATA_CHANGED"
  | "PING"
  | "PONG"
  | "CONNECTED"
  | "ERROR"
  | "USER_CONFIG_CHANGED"
  | "AUDIO_INGESTION_STATUS";

export interface WebSocketMessage {
  type: MessageType;
  entity?: EntityType;
  timestamp: number;
  data?: unknown;
  requestId?: string;
  originId?: string;
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
  originId?: string;
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

export interface UserConfigChangedMessage extends WebSocketMessage {
  type: "USER_CONFIG_CHANGED";
  data: {
    config: Record<string, unknown>;
  };
}

export interface AudioIngestionStatusMessage extends WebSocketMessage {
  type: "AUDIO_INGESTION_STATUS";
  data: {
    filename: string;
    status: "success" | "skipped" | "error" | "timeout";
    songId?: string;
    hash?: string;
    duration?: number;
    error?: string;
    bytes?: number;
  };
}

// Zod schemas for runtime validation
export const WebSocketMessageSchema: z.ZodType<WebSocketMessage> = z.lazy(() =>
  z
    .object({
      type: z.enum([
        "DATA_CHANGED",
        "PING",
        "PONG",
        "CONNECTED",
        "ERROR",
        "USER_CONFIG_CHANGED",
        "AUDIO_INGESTION_STATUS",
      ]),
      entity: z.enum(["song", "album", "artist", "playlist", "coverArt"]).optional(),
      timestamp: z.number(),
      data: z.unknown().optional(),
      requestId: z.string().optional(),
      error: z.string().optional(),
    })
    .strict(),
);

export const DataChangedMessageSchema: z.ZodType<DataChangedMessage> = z
  .object({
    type: z.literal("DATA_CHANGED"),
    entity: z.enum(["song", "album", "artist", "playlist", "coverArt"]),
    timestamp: z.number(),
    data: z.object({
      created: z.array(z.record(z.string(), z.unknown())).optional(),
      updated: z.array(z.record(z.string(), z.unknown())).optional(),
      deleted: z.array(z.object({ id: z.string() })).optional(),
    }),
    requestId: z.string().optional(),
  })
  .strict();

export const PingMessageSchema: z.ZodType<PingMessage> = z
  .object({
    type: z.literal("PING"),
    timestamp: z.number(),
  })
  .strict();

export const PongMessageSchema: z.ZodType<PongMessage> = z
  .object({
    type: z.literal("PONG"),
    timestamp: z.number(),
  })
  .strict();

export const ConnectedMessageSchema: z.ZodType<ConnectedMessage> = z
  .object({
    type: z.literal("CONNECTED"),
    timestamp: z.number(),
  })
  .strict();

export const ErrorMessageSchema: z.ZodType<ErrorMessage> = z
  .object({
    type: z.literal("ERROR"),
    timestamp: z.number(),
    error: z.string(),
  })
  .strict();

export const UserConfigChangedMessageSchema: z.ZodType<UserConfigChangedMessage> = z
  .object({
    type: z.literal("USER_CONFIG_CHANGED"),
    timestamp: z.number(),
    data: z.object({
      config: z.record(z.string(), z.unknown()),
    }),
  })
  .strict();

export const AudioIngestionStatusMessageSchema: z.ZodType<AudioIngestionStatusMessage> = z
  .object({
    type: z.literal("AUDIO_INGESTION_STATUS"),
    timestamp: z.number(),
    data: z.object({
      filename: z.string(),
      status: z.enum(["success", "skipped", "error", "timeout"]),
      songId: z.string().uuid().optional(),
      hash: z.string().optional(),
      duration: z.number().optional(),
      error: z.string().optional(),
      bytes: z.number().optional(),
    }),
  })
  .strict();
