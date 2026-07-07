import { z } from 'zod';

export const UrlMapSchema = z.record(z.string(), z.string());

export const ArtistSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  aliases: z.array(z.string()).optional().default([]),
  description: z.string().nullable().optional(),
  urls: UrlMapSchema.optional().default({}),
  songCount: z.number().int().optional(),
});

export const ArtistCreateSchema = z.object({
  name: z.string().min(1, 'Artist name is required').max(255, 'Artist name must be 255 characters or less'),
  aliases: z.array(z.string()).optional(),
  description: z.string().optional(),
  urls: UrlMapSchema.optional(),
});

export const SongListItemSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  releasedAt: z.string().nullable().optional(),
  preferred: z.boolean(),
});

export const CoverArtSchema = z.object({
  id: z.string().uuid(),
  filePath: z.string(),
  width: z.number().int(),
  height: z.number().int(),
  fileExtension: z.string(),
  fileSizeBytes: z.number().int(),
  fileHash: z.string(),
  createdAt: z.string(),
});

export const AlbumSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  artistIds: z.array(z.string().uuid()).optional().default([]),
  artistNames: z.array(z.string()).optional().default([]),
  yearReleased: z.number().int().nullable().optional(),
});

export const SongSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  parentId: z.string().uuid().nullable().optional(),
  masterId: z.string().uuid().nullable().optional(),
  platformId: z.string().nullable().optional(),
  releasedAt: z.string().nullable().optional(),
  url: z.string().nullable().optional(),
  filePath: z.string().nullable().optional(),
  duration: z.number().nullable().optional(),
  fileExtension: z.string().nullable().optional(),
  fileSizeBytes: z.number().nullable().optional(),
  coverArtId: z.string().uuid().nullable().optional(),
  description: z.string().nullable().optional(),
  preferred: z.boolean(),
  trimRange: z.string().nullable().optional(),
  fileHash: z.string().nullable().optional(),
  tags: z.array(z.string()).optional().default([]),
  createdAt: z.string(),
  artistIds: z.array(z.string().uuid()).optional().default([]),
  artistNames: z.array(z.string()).optional().default([]),
});

// Helper to create optional UUID field that accepts empty strings
const optionalUUID = z.string().refine(
  (val) => val === '' || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val),
  { message: 'Invalid UUID' }
).nullable().optional();

// Helper to create optional datetime field that accepts empty strings
const optionalDatetime = z.string().refine(
  (val) => val === '' || !isNaN(Date.parse(val)),
  { message: 'Invalid ISO datetime' }
).nullable().optional();

export const SongCreateSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500, 'Title must be 500 characters or less'),
  artistIds: z.array(z.string().uuid()).min(1, 'At least one artist is required'),
  parentId: optionalUUID,
  platformId: z.string().max(200).nullable().optional(),
  releasedAt: optionalDatetime,
  url: z.string().max(2000).nullable().optional(),
  filePath: z.string().max(2000).nullable().optional(),
  coverArtId: optionalUUID,
  description: z.string().optional(),
  preferred: z.boolean().optional(),
  trimRange: z.string().nullable().optional(),
  fileHash: z.string().max(64).nullable().optional(),
  tags: z.array(z.string()).optional(),
});

export const SongTreeNodeSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  parentId: z.string().uuid().nullable().optional(),
  depth: z.number().int(),
  artistIds: z.array(z.string().uuid()),
  artistNames: z.array(z.string()),
  coverArtId: z.string().uuid().nullable().optional(),
  preferred: z.boolean(),
  releasedAt: z.string().nullable().optional(),
  trimRange: z.string().nullable().optional(),
});

export const SongTreeSchema = z.object({
  masterId: z.string().uuid(),
  nodes: z.array(SongTreeNodeSchema),
});

export const AlbumTrackSchema = z.object({
  trackNumber: z.number().int(),
  referenceTitle: z.string().nullable().optional(),
  song: z.object({ id: z.string().uuid(), title: z.string() }).nullable(),
  isRegistered: z.boolean(),
});

export const AlbumDetailSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  artistIds: z.array(z.string().uuid()).optional().default([]),
  artistNames: z.array(z.string()).optional().default([]),
  yearReleased: z.number().int().nullable().optional(),
  coverArtId: z.string().uuid().nullable().optional(),
  trackList: z.array(z.object({ number: z.number().int(), title: z.string() })),
  urls: UrlMapSchema.optional().default({}),
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

export type Artist = z.infer<typeof ArtistSchema>;
export type ArtistCreateInput = z.infer<typeof ArtistCreateSchema>;
export type Song = z.infer<typeof SongSchema>;
export type SongCreateInput = z.infer<typeof SongCreateSchema>;
export type SongListItem = z.infer<typeof SongListItemSchema>;
export type SongTreeNode = z.infer<typeof SongTreeNodeSchema>;
export type SongTree = z.infer<typeof SongTreeSchema>;
export type Album = z.infer<typeof AlbumSchema>;
export type AlbumDetail = z.infer<typeof AlbumDetailSchema>;
