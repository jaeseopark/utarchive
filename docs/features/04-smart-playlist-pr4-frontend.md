# Smart Playlist Frontend

Smart playlists let users define boolean filter expressions to auto-populate a playlist, similar to Apple Music on macOS. The feature is built around a filter expression parser, tag-aware song indexing, and a frontend query editor for live preview.

## High-Level Concept

The frontend provides a visual filter builder so users can construct expressions without typing raw syntax. It also offers preview and playlist management UI, while sending the expression to the backend for validation and execution.

## Implementation Instructions

### UI Library Choice

Use `react-querybuilder` for the editor:

- supports nested boolean rules
- customizable fields and operators
- good TypeScript support
- can export to custom expression strings

Alternative: custom rule builder using shadcn/ui components, but `react-querybuilder` accelerates MVP delivery.

### Core Components

- `SmartPlaylistEditor`
  - Name input
  - Query builder component
  - Create/Save button
  - Preview trigger
- `SmartPlaylistPreview`
  - Shows top matching songs
  - Uses `/api/smart-playlists/preview`
- `SmartPlaylistListPage`
  - Lists existing smart playlists
  - Shows name, filter, count
- `SmartPlaylistDetailPage`
  - Shows filter expression and song list
  - Allows edit/delete actions

### Expression Formatting

Implement a formatter that converts query builder state to backend syntax:

- `tags` + `includes` → `tags.includes("foo")`
- `!tags.includes("bar")` → `!tags.includes("bar")`
- `artist = "foo"` → `artist = "foo"`
- `duration > 300` → `duration > 300`

Keep the format stable so the backend parser can validate it reliably.

### Preview Workflow

- Debounce input changes (e.g. 300-500ms)
- Call preview endpoint with the expression
- Display a short list of matching songs
- Show parse or validation errors inline

### Validation UX

- Highlight invalid rule fields
- Provide inline error messages for unsupported expressions
- Disable save until expression is valid

### Routes and Navigation

Add pages and navigation for:

- `/smart-playlists`
- `/smart-playlists/new`
- `/smart-playlists/:id`
- `/smart-playlists/:id/edit`

### Testing

- Storybook stories for editor and preview
- Component tests for expression formatting
- End-to-end test for create+preview flow

### Notes

Focus first on rule creation and preview; playback and sorting can be added after the MVP. The frontend should remain declarative and avoid implementing expression logic locally beyond formatting and validation.
