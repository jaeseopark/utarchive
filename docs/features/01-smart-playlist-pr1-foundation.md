# Smart Playlist PR 1: Tags Backend

Smart playlists let users define boolean filter expressions to auto-populate a playlist, similar to Apple Music on macOS. The feature is built around a filter expression parser, tag-aware song indexing, and a frontend query editor for live preview.

## High-Level Concept

Tags are the core filter field for smart playlists, and they must be stored in a way that is both easy to query and easy to update. For PR #1, the focus is on adding tag storage to the backend and exposing API endpoints to manage song tags.

## Implementation Instructions

### Database Schema

- Add `tags` to the `songs` table:
  - `TEXT[] NOT NULL DEFAULT '{}'`
- Create a GIN index for fast array queries:
  - `CREATE INDEX songs_tags_gin_idx ON songs USING gin(tags);`

### Backend Query Support

- Use PostgreSQL array containment for tag inclusion:
  - `songs.tags @> ARRAY['rock']::text[]`
- Use negation for exclusion:
  - `NOT (songs.tags @> ARRAY['explicit']::text[])`

### API Endpoints

Add endpoints to manage tags without UI dependencies:

- `PATCH /api/songs/:id/tags`
  - Request body: `{ tags: string[] }`
  - Behavior: replace or upsert the song's tag array
- `GET /api/tags`
  - Returns unique tags used across the library
  - Useful for autocomplete and admin tooling

### Validation and Normalization

- Validate tags are strings
- Normalize whitespace before saving
- Consider lowercasing tags if you want case-insensitive matching
- Reject invalid payloads with 400 errors

### Testing

- Add backend tests for tag updates
- Verify tags persist after PATCH
- Confirm the GIN index is created by migration
- Add a query test for inclusion and exclusion semantics

### Scope for PR #1

This PR delivers the persistent model for tags so smart playlists can be built on a stable data foundation. It should be fully deployable by itself and does not include any frontend UI for tag editing.
