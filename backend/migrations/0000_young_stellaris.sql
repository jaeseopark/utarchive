CREATE TABLE "album_artists" (
	"album_id" uuid NOT NULL,
	"artist_id" uuid NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "album_artists_album_id_artist_id_pk" PRIMARY KEY("album_id","artist_id")
);
--> statement-breakpoint
CREATE TABLE "album_songs" (
	"album_id" uuid NOT NULL,
	"song_id" uuid NOT NULL,
	"track_number" integer NOT NULL,
	CONSTRAINT "album_songs_album_id_song_id_pk" PRIMARY KEY("album_id","song_id")
);
--> statement-breakpoint
CREATE TABLE "albums" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(500) NOT NULL,
	"year_released" integer,
	"cover_art_id" uuid,
	"track_list" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"urls" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "artists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(500) NOT NULL,
	"aliases" text[] DEFAULT '{}' NOT NULL,
	"description" text,
	"urls" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cover_art" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"file_path" varchar(2000) NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"file_extension" varchar(16),
	"file_size_bytes" bigint,
	"file_hash" varchar(64) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "cover_art_file_hash_unique" UNIQUE("file_hash")
);
--> statement-breakpoint
CREATE TABLE "listening_analytics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"song_id" uuid NOT NULL,
	"started_at" timestamp NOT NULL,
	"duration_seconds" real NOT NULL,
	"playback_percent" real NOT NULL,
	"user_agent" text
);
--> statement-breakpoint
CREATE TABLE "playlist_songs" (
	"playlist_id" uuid NOT NULL,
	"song_id" uuid NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "playlist_songs_playlist_id_position_pk" PRIMARY KEY("playlist_id","position")
);
--> statement-breakpoint
CREATE TABLE "playlists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(500) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "song_artists" (
	"song_id" uuid NOT NULL,
	"artist_id" uuid NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "song_artists_song_id_artist_id_pk" PRIMARY KEY("song_id","artist_id")
);
--> statement-breakpoint
CREATE TABLE "song_hierarchy" (
	"song_id" uuid NOT NULL,
	"parent_id" uuid,
	"master_id" uuid NOT NULL,
	CONSTRAINT "song_hierarchy_song_id_pk" PRIMARY KEY("song_id")
);
--> statement-breakpoint
CREATE TABLE "songs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(500) NOT NULL,
	"platform_id" varchar(200),
	"released_at" timestamp,
	"url" varchar(2000),
	"file_path" varchar(2000),
	"duration" real,
	"file_extension" varchar(16),
	"file_size_bytes" bigint,
	"cover_art_id" uuid,
	"description" text,
	"playback_enabled" boolean DEFAULT false NOT NULL,
	"trim_range" varchar(32),
	"file_hash" varchar(64),
	"tags" text[] DEFAULT '{}' NOT NULL,
	"search_vector" "tsvector",
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "songs_file_hash_unique" UNIQUE("file_hash"),
	CONSTRAINT "songs_platform_id_unique" UNIQUE("platform_id")
);
--> statement-breakpoint
CREATE TABLE "totp_keys" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"totp_key_hash" varchar(64),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "album_artists" ADD CONSTRAINT "album_artists_album_id_albums_id_fk" FOREIGN KEY ("album_id") REFERENCES "public"."albums"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "album_artists" ADD CONSTRAINT "album_artists_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "album_songs" ADD CONSTRAINT "album_songs_album_id_albums_id_fk" FOREIGN KEY ("album_id") REFERENCES "public"."albums"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "album_songs" ADD CONSTRAINT "album_songs_song_id_songs_id_fk" FOREIGN KEY ("song_id") REFERENCES "public"."songs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "albums" ADD CONSTRAINT "albums_cover_art_id_cover_art_id_fk" FOREIGN KEY ("cover_art_id") REFERENCES "public"."cover_art"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listening_analytics" ADD CONSTRAINT "listening_analytics_song_id_songs_id_fk" FOREIGN KEY ("song_id") REFERENCES "public"."songs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playlist_songs" ADD CONSTRAINT "playlist_songs_playlist_id_playlists_id_fk" FOREIGN KEY ("playlist_id") REFERENCES "public"."playlists"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playlist_songs" ADD CONSTRAINT "playlist_songs_song_id_songs_id_fk" FOREIGN KEY ("song_id") REFERENCES "public"."songs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "song_artists" ADD CONSTRAINT "song_artists_song_id_songs_id_fk" FOREIGN KEY ("song_id") REFERENCES "public"."songs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "song_artists" ADD CONSTRAINT "song_artists_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "song_hierarchy" ADD CONSTRAINT "song_hierarchy_song_id_songs_id_fk" FOREIGN KEY ("song_id") REFERENCES "public"."songs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "song_hierarchy" ADD CONSTRAINT "song_hierarchy_parent_id_songs_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."songs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "song_hierarchy" ADD CONSTRAINT "song_hierarchy_master_id_songs_id_fk" FOREIGN KEY ("master_id") REFERENCES "public"."songs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "songs" ADD CONSTRAINT "songs_cover_art_id_cover_art_id_fk" FOREIGN KEY ("cover_art_id") REFERENCES "public"."cover_art"("id") ON DELETE no action ON UPDATE no action;