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

export const SongListItemSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  releasedAt: z.string().nullable().optional(),
  preferred: z.boolean(),
});

export const AlbumSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  artistId: z.string().uuid(),
  artistName: z.string().nullable().optional(),
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
  trimStart: z.number().nullable().optional(),
  trimEnd: z.number().nullable().optional(),
  createdAt: z.string(),
  artistIds: z.array(z.string().uuid()).optional().default([]),
  artistNames: z.array(z.string()).optional().default([]),
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
  trimStart: z.number().nullable().optional(),
  trimEnd: z.number().nullable().optional(),
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
  artistId: z.string().uuid(),
  artistName: z.string().nullable().optional(),
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

export const LogoutResponseSchema = z.object({
  ok: z.literal(true),
});

export type Artist = z.infer<typeof ArtistSchema>;
export type Song = z.infer<typeof SongSchema>;
export type SongListItem = z.infer<typeof SongListItemSchema>;
export type SongTreeNode = z.infer<typeof SongTreeNodeSchema>;
export type SongTree = z.infer<typeof SongTreeSchema>;
export type Album = z.infer<typeof AlbumSchema>;
export type AlbumDetail = z.infer<typeof AlbumDetailSchema>;
