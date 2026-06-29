import {
  bigint,
  boolean,
  check,
  customType,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { sql } from "drizzle-orm/sql";

const tsvector = customType<{ data: string; driverData: string }>({
  dataType: () => "tsvector",
  toDriver: (value) => value,
  fromDriver: (value) => value,
});

export const artists = pgTable("artists", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 500 }).notNull(),
  aliases: text("aliases").array().$type<string[]>().notNull().default([]),
  description: text("description"),
  urls: jsonb("urls").$type<Record<string, string>>().notNull().default({}),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const coverArt = pgTable("cover_art", {
  id: uuid("id").primaryKey().defaultRandom(),
  filePath: varchar("file_path", { length: 2000 }).notNull(),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  fileExtension: varchar("file_extension", { length: 16 }),
  fileSizeBytes: bigint("file_size_bytes", { mode: "bigint" }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const albums = pgTable("albums", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 500 }).notNull(),
  artistId: uuid("artist_id").notNull().references(() => artists.id),
  yearReleased: integer("year_released"),
  coverArtId: uuid("cover_art_id").references(() => coverArt.id),
  trackList: jsonb("track_list").$type<unknown[]>().notNull().default([]),
  urls: jsonb("urls").$type<Record<string, string>>().notNull().default({}),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export let songs: any;

songs = pgTable(
  "songs",
  (t) => ({
    id: uuid("id").primaryKey().defaultRandom(),
    title: varchar("title", { length: 500 }).notNull(),
    parentId: uuid("parent_id").references(() => songs.id),
    masterId: uuid("master_id").references(() => songs.id),
    platformId: varchar("platform_id", { length: 200 }),
    releasedAt: timestamp("released_at", { mode: "date" }),
    url: varchar("url", { length: 2000 }),
    filePath: varchar("file_path", { length: 2000 }),
    duration: real("duration"),
    fileExtension: varchar("file_extension", { length: 16 }),
    fileSizeBytes: bigint("file_size_bytes", { mode: "bigint" }),
    coverArtId: uuid("cover_art_id").references(() => coverArt.id),
    description: text("description"),
    preferred: boolean("preferred").notNull().default(true),
    trimStart: real("trim_start"),
    trimEnd: real("trim_end"),
    searchVector: tsvector("search_vector"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  }),
  () => [
    check(
      "songs_trim_valid",
      sql`trim_start IS NULL OR trim_end IS NULL OR trim_start < trim_end`
    ),
  ]
);

export const listeningAnalytics = pgTable("listening_analytics", {
  id: uuid("id").primaryKey().defaultRandom(),
  songId: uuid("song_id").notNull().references(() => songs.id),
  startedAt: timestamp("started_at", { mode: "date" }).notNull(),
  durationSeconds: real("duration_seconds").notNull(),
  playbackPercent: real("playback_percent").notNull(),
  userAgent: text("user_agent"),
});

export const songArtists = pgTable(
  "song_artists",
  {
    songId: uuid("song_id").notNull().references(() => songs.id),
    artistId: uuid("artist_id").notNull().references(() => artists.id),
    displayOrder: integer("display_order").notNull().default(0),
  },
  (table) => ({
    pk: primaryKey(table.songId, table.artistId),
  })
);

export const albumSongs = pgTable(
  "album_songs",
  {
    albumId: uuid("album_id").notNull().references(() => albums.id),
    songId: uuid("song_id").notNull().references(() => songs.id),
    trackNumber: integer("track_number").notNull(),
  },
  (table) => ({
    pk: primaryKey(table.albumId, table.songId),
  })
);

export const playlists = pgTable("playlists", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 500 }).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const playlistSongs = pgTable(
  "playlist_songs",
  {
    playlistId: uuid("playlist_id").notNull().references(() => playlists.id),
    songId: uuid("song_id").notNull().references(() => songs.id),
    position: integer("position").notNull(),
  },
  (table) => ({
    pk: primaryKey(table.playlistId, table.position),
  })
);

export type Artist = typeof artists.$inferSelect;
export type ArtistInsert = typeof artists.$inferInsert;
export type Song = typeof songs.$inferSelect;
export type SongInsert = typeof songs.$inferInsert;
export type Album = typeof albums.$inferSelect;
export type AlbumInsert = typeof albums.$inferInsert;
export type CoverArt = typeof coverArt.$inferSelect;
export type CoverArtInsert = typeof coverArt.$inferInsert;
export type Playlist = typeof playlists.$inferSelect;
export type PlaylistInsert = typeof playlists.$inferInsert;
export type ListeningAnalytics = typeof listeningAnalytics.$inferSelect;
