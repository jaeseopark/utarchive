# utarchive

utarchive is a song archival tool for tracking original songs, covers, remixes, and album associations in a unified song-centric system.

## What it does

- Stores songs with parent-child relationships, enabling unlimited remix/cover trees
- Displays a full family tree for each song
- Supports albums with track reference lists and album-song associations
- Shows all songs for a given artist
- Provides built-in streaming for local audio files via authenticated byte-range playback
- Supports playlists with ordered song queues and preferred-song skip logic
- Includes PostgreSQL full-text search across song, artist, and album metadata

## Key data models

- `songs`: title, parent/master tree links, platform id, archive/release timestamps, play count, artist, URL, local stream file, description, preferred flag
- `artists`: name, aliases, description, URL map
- `albums`: title, artist, year, reference track list, URL map
- `album_songs`: album-song association with track number
- `playlists`: named playlist containers
- `playlist_songs`: ordered song positions within playlists

## Stack

- Frontend: React + Vite + TypeScript + Tailwind CSS + shadcn/ui
- Backend: Node.js + Express + ws
- ORM: Drizzle ORM + drizzle-kit + drizzle-zod
- Database: PostgreSQL (external)
- Deployment: single Docker image with compiled React served by Express

## Authentication

- Single-user auth via environment variable: `AUTH_CREDENTIALS=id,password,totp_key`
- Uses TOTP + password login
- Authenticated users are required to access audio streaming and protected API routes

## Environment variables

- `DATABASE_URL` — Postgres connection string
- `AUTH_CREDENTIALS` — `id,password,totp_key`
- `JWT_SECRET` — JWT signing secret
- `JWT_TTL_SECONDS` — optional token lifetime (default: 3600)
- `PORT` — optional server port (default: 3000)
- `NODE_ENV` — optional environment mode

## Notes

- Songs are never deleted, so parent/master relationships remain stable
- Album track lists are reference-only and can flag missing tracks
- Local audio files are served from paths stored in the DB; mount a host directory into the container for file access
- The app is designed around songs first, with albums and playlists built on top
