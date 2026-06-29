# Smart Playlist Backend

Smart playlists let users define boolean filter expressions to auto-populate a playlist, similar to Apple Music on macOS. The feature is built around a filter expression parser, tag-aware song indexing, and a frontend query editor for live preview.

## High-Level Concept

The backend stores smart playlist definitions, validates expressions, and evaluates them against the song catalog. It exposes APIs for creation, preview, and retrieval of matching songs.

## Implementation Instructions

### Database Model

Add `smart_playlists` table:

- `id UUID PRIMARY KEY`
- `name VARCHAR(500) NOT NULL`
- `filter_expression TEXT NOT NULL`
- `filter_ast JSONB NOT NULL`
- `created_at TIMESTAMP NOT NULL DEFAULT NOW()`
- `updated_at TIMESTAMP NOT NULL DEFAULT NOW()`

Optional cache table for performance:

- `smart_playlist_songs`
  - `smart_playlist_id UUID`
  - `song_id UUID`
  - primary key (`smart_playlist_id`, `song_id`)

### Parser and AST

Implement a parser that supports MVP syntax:

- `field = "value"`
- `field != "value"`
- `tags.includes("foo")`
- `!tags.includes("foo")`
- `and`, `or`, `not`
- parentheses for grouping

Store the parsed AST in `filter_ast` so validation happens once and expression structure can be reused.

### SQL Evaluation

Convert AST nodes into Drizzle SQL conditions:

- `tags.includes(tag)` → `songs.tags @> ARRAY[tag]::text[]`
- `!tags.includes(tag)` → `NOT (songs.tags @> ARRAY[tag]::text[])`
- `artist = "foo"` → join `artists` and filter by name
- `preferred = true` → direct boolean filter

### API Endpoints

- `POST /api/smart-playlists`
  - Create and validate expression
- `GET /api/smart-playlists`
  - List definitions
- `GET /api/smart-playlists/:id`
  - Return playlist metadata and optionally cached song list
- `PATCH /api/smart-playlists/:id`
  - Update name/filter
- `DELETE /api/smart-playlists/:id`
- `POST /api/smart-playlists/preview`
  - Evaluate expression without saving

### Validation

- Limit expression length to a safe maximum
- Reject invalid fields or unsupported operators
- Return understandable error messages for parse failures
- Use parameterized queries via Drizzle to avoid SQL injection

### Caching Strategy

For MVP, evaluate expressions on demand. Later add caching when:

- playlists are large
- preview response time needs improvement
- live playlists need automated refresh

A cache table can be updated when song tags or relevant fields change.

### Testing

Add unit tests for:

- parser correctness
- AST shape for sample expressions
- SQL conditions for tag inclusion/exclusion
- API validation behavior
- preview endpoint results
