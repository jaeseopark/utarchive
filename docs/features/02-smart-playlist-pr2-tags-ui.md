# Smart Playlist PR 2: Tags UI

Smart playlists let users define boolean filter expressions to auto-populate a playlist, similar to Apple Music on macOS. The feature is built around a filter expression parser, tag-aware song indexing, and a frontend query editor for live preview.

## High-Level Concept

This PR adds the user-facing tag editing experience so songs can be labeled with values like `favorite`, `rock`, or `live`. The backend tag model already exists from PR #1. PR #2 is focused on making tag management easy and discoverable.

## Implementation Instructions

### Frontend Components

- `TagInput` component
  - Multi-select input
  - Autocomplete suggestions from `GET /api/tags`
  - Create new tags inline
- `SongDetailPage` integration
  - Display current tags
  - Allow add/remove operations

### API Integration

- Call `PATCH /api/songs/:id/tags` when the tag list changes
- Refresh song details after save
- Use the tags autocomplete endpoint for suggestions

### UX Behavior

- Show tags as removable pills
- Use inline input for new tags
- Disable save if the payload is invalid
- Provide validation helpers for tag formatting

### Testing

- Storybook story for `TagInput`
- Component test for add/remove behavior
- Integration test to confirm API calls are made correctly

### Scope for PR #2

This PR is strictly UI and API integration for tag editing. It should not include smart playlist creation or filtering logic. Once merged, users can tag songs, enabling future smart playlist work.
