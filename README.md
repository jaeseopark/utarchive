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

## Quick Start (Docker)

1. Start the app using the repository compose file:

```bash
docker compose -f docker-compose-dev.yml up --build
```

The `docker-compose-dev.yml` file includes default environment variables for development. To use your own `.env` file instead:
   - Create a `.env` file with your variables
   - Remove the `environment` section from `docker-compose-dev.yml`
   - Add `env_file: .env` to the `app` service in the compose file

2. If you want to mount local audio files, add a host mount to the compose file or use the example below.

3. Visit `http://localhost:3000` and check `GET /health`.

## Environment variables

| Variable | Required | Description |
|---|:---:|---|
| `DATABASE_URL` | ✅ | Postgres connection string |
| `AUTH_CREDENTIALS` | ✅ | `id,password,totp_key` |
| `JWT_SECRET` | ✅ | Random secret for JWT signing (min 32 chars recommended) |
| `JWT_TTL_SECONDS` | — | JWT lifetime in seconds (default: 3600) |
| `PORT` | — | HTTP server port (default: 3000) |
| `NODE_ENV` | — | `production` or `development` (default: `development`) |

## Audio file storage

Local audio files are served from absolute paths stored in the database. When running in Docker, mount a host directory into the container and write `file_path` values using that mounted path.

Example:

```bash
docker run --rm --env-file .env -p 3000:3000 -v /host/music:/music utarchive
```

Store `file_path` values like `/music/artist/song.mp3`.

## Notes

- Songs are never deleted, so parent/master relationships remain stable
- Album track lists are reference-only and can flag missing tracks
- Local audio files are served from paths stored in the DB; mount a host directory into the container for file access
- The app is designed around songs first, with albums and playlists built on top
