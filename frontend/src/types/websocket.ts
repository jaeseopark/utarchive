import { z } from "zod";

export type EntityType = "song" | "album" | "artist" | "playlist" | "coverArt";

export type MessageType = "DATA_CHANGED" | "PING" | "PONG" | "CONNECTED" | "ERROR" | "USER_CONFIG_CHANGED";

export interface WebSocketMessage {
  type: MessageType;
  entity?: EntityType;
  timestamp: number;
  data?: unknown;
  requestId?: string;
  error?: string;
}

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

export interface UserConfigChangedMessage extends WebSocketMessage {
  type: "USER_CONFIG_CHANGED";
  data: {
    config: Record<string, unknown>;
  };
}

// Zod schemas for runtime validation
export const WebSocketMessageSchema: z.ZodType<WebSocketMessage> = z.lazy(() =>
  z.object({
    type: z.enum(["DATA_CHANGED", "PING", "PONG", "CONNECTED", "ERROR", "USER_CONFIG_CHANGED"]),
    entity: z.enum(["song", "album", "artist", "playlist", "coverArt"]).optional(),
    timestamp: z.number(),
    data: z.unknown().optional(),
    requestId: z.string().optional(),
    error: z.string().optional(),
  }).strict()
);

export const DataChangedMessageSchema: z.ZodType<DataChangedMessage> = z.object({
  type: z.literal("DATA_CHANGED"),
  entity: z.enum(["song", "album", "artist", "playlist", "coverArt"]),
  timestamp: z.number(),
  data: z.object({
    created: z.array(z.record(z.string(), z.unknown())).optional(),
    updated: z.array(z.record(z.string(), z.unknown())).optional(),
    deleted: z.array(z.object({ id: z.string() })).optional(),
  }),
  requestId: z.string().optional(),
}).strict();

export const UserConfigChangedMessageSchema: z.ZodType<UserConfigChangedMessage> = z.object({
  type: z.literal("USER_CONFIG_CHANGED"),
  timestamp: z.number(),
  data: z.object({
    config: z.record(z.string(), z.unknown()),
  }),
}).strict();
