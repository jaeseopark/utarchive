import { z } from "zod";
import {
  toBrandId,
  type SongId,
  type ArtistId,
  type AlbumId,
  type CoverArtId,
} from "../types/brands";

export const UrlArraySchema = z.array(z.string());

export const ArtistSchema = z.object({
  id: z
    .string()
    .uuid()
    .transform((val) => toBrandId<ArtistId>(val)),
  name: z.string(),
  aliases: z.array(z.string()).optional().default([]),
  description: z.string().nullable().optional(),
  urls: z.array(z.string()).optional().default([]),
  songCount: z.number().int().optional(),
  createdAt: z.string(),
});

export const ArtistCreateSchema = z.object({
  name: z
    .string()
    .min(1, "Artist name is required")
    .max(255, "Artist name must be 255 characters or less"),
  aliases: z.array(z.string()).optional(),
  description: z.string().optional(),
  urls: z.array(z.string()).optional(),
});

export const SongListItemSchema = z.object({
  id: z
    .string()
    .uuid()
    .transform((val) => toBrandId<SongId>(val)),
  title: z.string(),
  releasedAt: z.string().nullable().optional(),
  playbackEnabled: z.boolean(),
  duration: z.number().nullable().optional(),
  filePath: z.string().nullable().optional(),
  coverArtId: z
    .string()
    .uuid()
    .nullable()
    .optional()
    .transform((val) => (val ? toBrandId<CoverArtId>(val) : null)),
  artistIds: z
    .array(
      z
        .string()
        .uuid()
        .transform((val) => toBrandId<ArtistId>(val)),
    )
    .optional()
    .default([]),
});

// Response schema for songs list endpoint (wrapped in object)
export const SongsResponseSchema = z.object({
  songs: z.array(SongListItemSchema),
});

export const CoverArtSchema = z.object({
  id: z
    .string()
    .uuid()
    .transform((val) => toBrandId<CoverArtId>(val)),
  filePath: z.string(),
  width: z.number().int(),
  height: z.number().int(),
  fileExtension: z.string(),
  fileSizeBytes: z.number().int(),
  fileHash: z.string(),
  createdAt: z.string(),
});


export const SongSchema = z.object({
  id: z
    .string()
    .uuid()
    .transform((val) => toBrandId<SongId>(val)),
  title: z.string(),
  parentId: z
    .string()
    .uuid()
    .nullable()
    .optional()
    .transform((val) => (val ? toBrandId<SongId>(val) : null)),
  masterId: z
    .string()
    .uuid()
    .nullable()
    .optional()
    .transform((val) => (val ? toBrandId<SongId>(val) : null)),
  releasedAt: z.string().nullable().optional(),
  urls: z.array(z.string()).optional().default([]),
  filePath: z.string().nullable().optional(),
  duration: z.number().nullable().optional(),
  fileExtension: z.string().nullable().optional(),
  fileSizeBytes: z.number().nullable().optional(),
  coverArtId: z
    .string()
    .uuid()
    .nullable()
    .optional()
    .transform((val) => (val ? toBrandId<CoverArtId>(val) : null)),
  description: z.string().nullable().optional(),
  playbackEnabled: z.boolean(),
  fileHash: z.string().nullable().optional(),
  tags: z.array(z.string()).optional().default([]),
  createdAt: z.string(),
  artistIds: z
    .array(
      z
        .string()
        .uuid()
        .transform((val) => toBrandId<ArtistId>(val)),
    )
    .optional()
    .default([]),
  albumIds: z
    .array(
      z
        .string()
        .uuid()
        .transform((val) => toBrandId<AlbumId>(val)),
    )
    .optional()
    .default([]),
});

// Helper to create optional UUID field that accepts empty strings
const optionalUUID = z
  .string()
  .refine(
    (val) =>
      val === "" || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val),
    { message: "Invalid UUID" },
  )
  .nullable()
  .optional();

// Helper to create optional datetime field that accepts empty strings
const optionalDatetime = z
  .string()
  .refine((val) => val === "" || !isNaN(Date.parse(val)), { message: "Invalid ISO datetime" })
  .nullable()
  .optional();

// Branded ID versions of optional UUID helpers
const optionalSongId = optionalUUID.transform((val) => (val ? toBrandId<SongId>(val) : null));
const optionalCoverArtId = optionalUUID.transform((val) =>
  val ? toBrandId<CoverArtId>(val) : null,
);

// Album-related schemas
export const AlbumTrackListItemSchema = z.object({
  number: z.number().int().min(1),
  title: z.string().min(1),
  duration: z.number().min(0).optional(),
});

// Create schema - for API requests
export const AlbumCreateSchema = z.object({
  title: z.string().min(1, "Title is required").max(500, "Title must be 500 characters or less"),
  artistIds: z
    .array(
      z
        .string()
        .uuid()
        .transform((val) => toBrandId<ArtistId>(val)),
    )
    .min(1, "At least one artist is required"),
  yearReleased: z.number().int().nullable().optional(),
  coverArtId: optionalCoverArtId,
  trackList: z.array(AlbumTrackListItemSchema).optional(),
  urls: UrlArraySchema.optional(),
});

// Form schema - for form data that stays as strings
export const AlbumCreateFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(500, "Title must be 500 characters or less"),
  artistIds: z.array(z.string().uuid()).min(1, "At least one artist is required"),
  yearReleased: z.string().optional().nullable(),
  coverArtId: optionalUUID,
  trackList: z.array(AlbumTrackListItemSchema).optional(),
  urls: UrlArraySchema.optional(),
});

export const SongCreateSchema = z.object({
  title: z.string().min(1, "Title is required").max(500, "Title must be 500 characters or less"),
  artistIds: z
    .array(
      z
        .string()
        .uuid()
        .transform((val) => toBrandId<ArtistId>(val)),
    )
    .min(1, "At least one artist is required"),
  parentId: optionalSongId,
  releasedAt: optionalDatetime,
  urls: z.array(z.string()).optional(),
  filePath: z.string().max(2000).nullable().optional(),
  coverArtId: optionalCoverArtId,
  description: z.string().optional(),
  playbackEnabled: z.boolean().optional(),
  trimRange: z.string().nullable().optional(),
  fileHash: z.string().max(64).nullable().optional(),
  tags: z.array(z.string()).optional(),
});

// Form schema without transforms - for form data that stays as strings
export const SongCreateFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(500, "Title must be 500 characters or less"),
  artistIds: z.array(z.string().uuid()).min(1, "At least one artist is required"),
  parentId: optionalUUID,
  releasedAt: optionalDatetime,
  urls: z.array(z.string()).optional(),
  filePath: z.string().max(2000).nullable().optional(),
  coverArtId: optionalUUID,
  description: z.string().optional(),
  playbackEnabled: z.boolean().optional(),
  trimRange: z.string().nullable().optional(),
  fileHash: z.string().max(64).nullable().optional(),
  tags: z.array(z.string()).optional(),
});

export const SongTreeNodeSchema = z.object({
  id: z
    .string()
    .uuid()
    .transform((val) => toBrandId<SongId>(val)),
  title: z.string(),
  parentId: z
    .string()
    .uuid()
    .nullable()
    .optional()
    .transform((val) => (val ? toBrandId<SongId>(val) : null)),
  depth: z.number().int(),
  artistIds: z.array(
    z
      .string()
      .uuid()
      .transform((val) => toBrandId<ArtistId>(val)),
  ),
  coverArtId: z
    .string()
    .uuid()
    .nullable()
    .optional()
    .transform((val) => (val ? toBrandId<CoverArtId>(val) : null)),
  playbackEnabled: z.boolean(),
  releasedAt: z.string().nullable().optional(),
  trimRange: z.string().nullable().optional(),
});

export const SongTreeSchema = z.object({
  masterId: z
    .string()
    .uuid()
    .transform((val) => toBrandId<SongId>(val)),
  nodes: z.array(SongTreeNodeSchema),
});

export const AlbumTrackSchema = z.object({
  trackNumber: z.number().int(),
  referenceTitle: z.string().nullable().optional(),
  song: z
    .object({
      id: z
        .string()
        .uuid()
        .transform((val) => toBrandId<SongId>(val)),
      title: z.string(),
    })
    .nullable(),
  isRegistered: z.boolean(),
});

export const AlbumSchema = z.object({
  id: z
    .string()
    .uuid()
    .transform((val) => toBrandId<AlbumId>(val)),
  title: z.string(),
  artistIds: z
    .array(
      z
        .string()
        .uuid()
        .transform((val) => toBrandId<ArtistId>(val)),
    )
    .optional()
    .default([]),
  yearReleased: z.number().int().nullable().optional(),
  coverArtId: z
    .string()
    .uuid()
    .nullable()
    .optional()
    .transform((val) => (val ? toBrandId<CoverArtId>(val) : null)),
  trackList: z.array(
    z.object({
      number: z.number().int(),
      title: z.string(),
      duration: z.number().int().min(0).optional(),
    }),
  ),
  urls: UrlArraySchema.default([]),
  createdAt: z.string(),
  tracks: z.array(AlbumTrackSchema),
});

export const LoginResponseSchema = z.object({
  id: z.string(),
});

export const SessionSchema = z.object({
  id: z.string(),
});

export const AnalyticsListenResponseSchema = z.object({
  ok: z.literal(true),
});

export const LogoutResponseSchema = z.object({
  ok: z.literal(true),
});

// User config schemas
export const PlaybackConfigSchema = z.object({
  shuffle: z.boolean().optional(),
  repeat: z.enum(["off", "one", "all"]).optional(),
});

export const UserConfigSchema = z
  .object({
    playback: PlaybackConfigSchema.optional(),
  })
  .passthrough(); // Allow additional properties for future extensibility

export const UserConfigResponseSchema = z.object({
  config: UserConfigSchema,
});

export type Artist = z.infer<typeof ArtistSchema>;
export type ArtistCreateInput = z.infer<typeof ArtistCreateSchema>;
export type CoverArt = z.infer<typeof CoverArtSchema>;
export type Song = z.infer<typeof SongSchema>;
export type SongCreateInput = z.infer<typeof SongCreateSchema>;
export type SongCreateFormInput = z.infer<typeof SongCreateFormSchema>;
export type SongListItem = z.infer<typeof SongListItemSchema>;
export type SongTreeNode = z.infer<typeof SongTreeNodeSchema>;
export type SongTree = z.infer<typeof SongTreeSchema>;
export type Album = z.infer<typeof AlbumSchema>;
export type AlbumCreateInput = z.infer<typeof AlbumCreateSchema>;
export type AlbumCreateFormInput = z.infer<typeof AlbumCreateFormSchema>;
export type UserConfig = z.infer<typeof UserConfigSchema>;
export type PlaybackConfig = z.infer<typeof PlaybackConfigSchema>;
