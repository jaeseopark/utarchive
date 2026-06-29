-- Initial database schema for utarchive

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE artists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(500) NOT NULL,
  aliases text[] NOT NULL DEFAULT ARRAY[]::text[],
  description text,
  urls jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE cover_art (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_path varchar(2000) NOT NULL,
  width integer NOT NULL,
  height integer NOT NULL,
  file_extension varchar(16),
  file_size_bytes bigint,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE albums (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title varchar(500) NOT NULL,
  artist_id uuid NOT NULL REFERENCES artists(id),
  year_released integer,
  cover_art_id uuid REFERENCES cover_art(id),
  track_list jsonb NOT NULL DEFAULT '[]'::jsonb,
  urls jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE songs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title varchar(500) NOT NULL,
  parent_id uuid REFERENCES songs(id),
  master_id uuid REFERENCES songs(id),
  platform_id varchar(200),
  released_at timestamp with time zone,
  url varchar(2000),
  file_path varchar(2000),
  duration real,
  file_extension varchar(16),
  file_size_bytes bigint,
  cover_art_id uuid REFERENCES cover_art(id),
  description text,
  preferred boolean NOT NULL DEFAULT true,
  trim_range varchar(32),
  file_hash varchar(64) UNIQUE,
  tags text[] NOT NULL DEFAULT ARRAY[]::text[],
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(url, ''))
  ) STORED,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE song_artists (
  song_id uuid NOT NULL REFERENCES songs(id),
  artist_id uuid NOT NULL REFERENCES artists(id),
  display_order integer NOT NULL DEFAULT 0,
  PRIMARY KEY (song_id, artist_id)
);

CREATE TABLE album_songs (
  album_id uuid NOT NULL REFERENCES albums(id),
  song_id uuid NOT NULL REFERENCES songs(id),
  track_number integer NOT NULL,
  PRIMARY KEY (album_id, song_id)
);

CREATE TABLE playlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(500) NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE playlist_songs (
  playlist_id uuid NOT NULL REFERENCES playlists(id),
  song_id uuid NOT NULL REFERENCES songs(id),
  position integer NOT NULL,
  PRIMARY KEY (playlist_id, position)
);

CREATE INDEX idx_songs_search_vector ON songs USING GIN (search_vector);
CREATE INDEX idx_songs_master_id ON songs (master_id);
CREATE INDEX songs_tags_gin_idx ON songs USING GIN (tags);
CREATE INDEX idx_song_artists_song_id ON song_artists (song_id);
CREATE INDEX idx_song_artists_artist_id ON song_artists (artist_id);
CREATE INDEX idx_album_songs_song_id ON album_songs (song_id);
CREATE INDEX idx_artists_fts ON artists USING GIN (to_tsvector('english', name));
CREATE INDEX idx_albums_fts ON albums USING GIN (to_tsvector('english', title));

CREATE TABLE listening_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id uuid NOT NULL REFERENCES songs(id),
  started_at timestamp with time zone NOT NULL,
  duration_seconds real NOT NULL,
  playback_percent real NOT NULL,
  user_agent text
);

CREATE INDEX idx_listening_analytics_song_id ON listening_analytics (song_id);
