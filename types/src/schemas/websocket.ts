import { z } from "zod";

// Entity types that can be changed via WebSocket
export type EntityType = "song" | "album" | "artist" | "playlist" | "coverArt";

export const EntityTypeSchema = z.enum(["song", "album", "artist", "playlist", "coverArt"]);

/**
 * Base WebSocket message - all messages extend this
 */
export const WebSocketMessageSchema = z.lazy(() =>
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
      entity: EntityTypeSchema.optional(),
      timestamp: z.number(),
      data: z.unknown().optional(),
      requestId: z.string().optional(),
      originId: z.string().optional(),
      error: z.string().optional(),
    })
    .strict(),
);

export type WebSocketMessage = z.infer<typeof WebSocketMessageSchema>;

/**
 * DATA_CHANGED message - notifies about entity changes
 */
export const DataChangedMessageSchema = z
  .object({
    type: z.literal("DATA_CHANGED"),
    entity: EntityTypeSchema,
    timestamp: z.number(),
    data: z.object({
      created: z.array(z.record(z.string(), z.unknown())).optional(),
      updated: z.array(z.record(z.string(), z.unknown())).optional(),
      deleted: z.array(z.object({ id: z.string() })).optional(),
    }),
    requestId: z.string().optional(),
    originId: z.string().optional(),
  })
  .strict();

export type DataChangedMessage = z.infer<typeof DataChangedMessageSchema>;

/**
 * USER_CONFIG_CHANGED message
 */
export const UserConfigChangedMessageSchema = z
  .object({
    type: z.literal("USER_CONFIG_CHANGED"),
    timestamp: z.number(),
    data: z.object({
      config: z.record(z.string(), z.unknown()),
    }),
  })
  .strict();

export type UserConfigChangedMessage = z.infer<typeof UserConfigChangedMessageSchema>;

/**
 * AUDIO_INGESTION_STATUS message
 */
export const AudioIngestionStatusMessageSchema = z
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

export type AudioIngestionStatusMessage = z.infer<typeof AudioIngestionStatusMessageSchema>;

/**
 * PING message
 */
export const PingMessageSchema = z.object({
  type: z.literal("PING"),
  timestamp: z.number(),
  originId: z.string().optional(),
});

export type PingMessage = z.infer<typeof PingMessageSchema>;

/**
 * PONG message
 */
export const PongMessageSchema = z.object({
  type: z.literal("PONG"),
  timestamp: z.number(),
  originId: z.string().optional(),
});

export type PongMessage = z.infer<typeof PongMessageSchema>;

/**
 * CONNECTED message - sent by server when client connects
 */
export const ConnectedMessageSchema = z.object({
  type: z.literal("CONNECTED"),
  timestamp: z.number(),
  originId: z.string().optional(),
});

export type ConnectedMessage = z.infer<typeof ConnectedMessageSchema>;

/**
 * ERROR message
 */
export const ErrorMessageSchema = z.object({
  type: z.literal("ERROR"),
  timestamp: z.number(),
  error: z.string().optional(),
  originId: z.string().optional(),
});

export type ErrorMessage = z.infer<typeof ErrorMessageSchema>;

