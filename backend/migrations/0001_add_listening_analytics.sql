CREATE TABLE listening_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id uuid NOT NULL REFERENCES songs(id),
  user_id varchar(2000) NOT NULL REFERENCES users(id),
  started_at timestamp with time zone NOT NULL,
  duration_seconds real NOT NULL,
  playback_percent real NOT NULL,
  user_agent text,
);

CREATE INDEX idx_listening_analytics_song_id ON listening_analytics (song_id);
CREATE INDEX idx_listening_analytics_user_id ON listening_analytics (user_id);
