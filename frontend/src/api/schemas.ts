import { z } from 'zod';

export const ArtistSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  displayName: z.string().optional(),
});

export const AlbumSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  artistId: z.string().uuid(),
});

export const SongSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  durationSeconds: z.number().int().nonnegative(),
  artistId: z.string().uuid(),
  albumId: z.string().uuid().optional(),
});

export const PlaylistSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
});

export type Artist = z.infer<typeof ArtistSchema>;
export type Album = z.infer<typeof AlbumSchema>;
export type Song = z.infer<typeof SongSchema>;
export type Playlist = z.infer<typeof PlaylistSchema>;
