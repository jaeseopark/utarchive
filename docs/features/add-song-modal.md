# Add Song Modal

## Context

As a user, I want to be able to add songs one by one through the UI using a modal form. This is the baseline song-adding experience for the application. The bulk import feature (see [bulk-import.md](./bulk-import.md)) is an optional enhancement that builds on top of this core functionality.

## UI Components

### Trigger Button
- **Location**: Next to the "Logout" button in the header (top-right of RootLayout)
- **Label**: "Add Song" or similar
- **Action**: Opens the Add Song Modal

### Add Song Modal
- **Form Library**: React Hook Form
- **Validation**: Real-time validation with error messages
- **State Management**: Modal resets to blank state after any action (Ok, Clear, or Cancel)

## Form Fields

The modal form should conform to the `songCreateSchema` from the backend API (`POST /api/songs`). All fields map directly to the backend schema.

### Required Fields

| Field | Type | Validation | Description |
|-------|------|------------|-------------|
| `title` | string | 1-500 characters | Song title |
| `artistIds` | string[] | Array of UUIDs, min 1 | Associated artist(s) |

### Optional Fields

| Field | Type | Validation | Description |
|-------|------|------------|-------------|
| `parentId` | UUID \| null | Valid UUID or null | Parent song for versions/variants |
| `platformId` | string \| null | Max 200 chars | External platform identifier (e.g., `spotify:track:xyz`) |
| `releasedAt` | string | ISO 8601 datetime | Release date/time |
| `url` | string \| null | Max 2000 chars | External URL to song |
| `filePath` | string \| null | Max 2000 chars | File path (metadata only) |
| `coverArtId` | UUID \| null | Valid UUID or null | Reference to cover art |
| `description` | string | No max length | Song description/notes |
| `preferred` | boolean | Boolean | Mark as preferred version (default: true) |
| `trimRange` | string \| null | String format | Audio trim points |
| `fileHash` | string \| null | Max 64 chars | File hash identifier |
| `tags` | string[] | Array of strings | Filterable tags |

## Form Validation Requirements

The modal must validate:

### A) Mandatory Fields Provided
- `title` must not be empty and must be between 1-500 characters
- `artistIds` must contain at least one valid UUID

### B) Expected Data Format
- All UUID fields (`artistIds`, `parentId`, `coverArtId`) must be valid UUID format
- `releasedAt` must be ISO 8601 datetime string (if provided)
- `url` must be valid URL format (if provided)
- String length constraints must be enforced per field specifications
- Arrays must be properly formatted (e.g., `artistIds`, `tags`)

### Validation Behavior
- Show inline error messages for invalid fields
- Disable "Ok" button when validation fails
- Show validation errors on blur and on submit attempt
- Clear validation errors when field is corrected

## Modal Actions

### 1. Ok (Primary Action)
- **Trigger**: Click "Ok" button or press Enter (when form is valid)
- **Validation**: Form must pass all validation checks
- **Behavior**:
  1. Submit `POST /api/songs` request with form data
  2. If successful (201 Created):
     - Add new song to frontend state management
     - Show success feedback (toast/notification)
     - Close modal
     - Reset form to blank state
  3. If failed:
     - Display error message from backend
     - Keep modal open with form data intact
     - Highlight specific field errors if provided

### 2. Clear
- **Trigger**: Click "Clear" button
- **Behavior**:
  - Reset all form fields to initial/empty state
  - Clear all validation errors
  - Keep modal open
  - Focus on first field (title)

### 3. Cancel
- **Trigger**: Click "Cancel" button, press Escape, or click outside modal
- **Behavior**:
  - Close modal without submitting
  - Reset form to blank state
  - Discard all unsaved changes

## Modal State Management

### Reset Behavior
The form must reset to blank state when:
- Modal is closed (Cancel action)
- Form is submitted successfully (Ok action)
- Clear button is clicked

This ensures that reopening the modal always starts with a fresh, empty form.

### State Persistence
- **No persistence**: Unsaved data is lost when modal closes
- **Rationale**: Prevents accidental duplicate submissions and maintains clear UX

## Frontend State Integration

Upon successful song creation (201 response):
1. Parse the returned song object from the API response
2. Update the frontend state management system (context/store)
3. New song should appear in relevant lists (artist detail pages, search results, etc.) without requiring page refresh

## Error Handling

### Client-Side Errors
- Validation errors: Display inline with field
- Network errors: Show user-friendly message ("Network error, please try again")
- Timeout: Show timeout message with retry option

### Server-Side Errors
- 400 Bad Request: Display validation errors from backend
- 401 Unauthorized: Redirect to login
- 409 Conflict: Show conflict message (e.g., duplicate `platformId`)
- 500 Server Error: Show generic error with support contact

## User Experience Considerations

### Artist Selection
- Provide searchable dropdown or autocomplete for `artistIds`
- Allow multiple artist selection
- Must have at least one artist selected

### Date Input
- Use date/datetime picker for `releasedAt`
- Format output as ISO 8601
- Allow manual entry with validation

### Optional Fields
- Clearly mark required vs optional fields
- Consider collapsible "Advanced Options" section for less common fields
- Provide helpful placeholder text or tooltips

### Cover Art Selection
- Provide preview of selected cover art
- Link to cover art management if needed
- Allow selection from existing cover art

### Tags Input
- Use tag input component with autocomplete
- Show existing tags for easy selection
- Allow creating new tags

## Accessibility

- Ensure modal is keyboard navigable
- Trap focus within modal when open
- Proper ARIA labels and roles
- Clear focus indicators
- Support Escape key to close
- Announce validation errors to screen readers

## Testing Considerations

- Test all validation rules
- Test successful submission flow
- Test error handling scenarios
- Test modal reset behavior
- Test keyboard navigation
- Test with and without optional fields
- Verify state management integration

## Implementation Notes

1. Use React Hook Form's `useForm` hook for form management
2. Use Zod for client-side validation (mirror backend schema)
3. Consider extracting validation schema to shared location if both frontend and backend can use it
4. Use existing UI components (Button, Input, Modal) from component library
5. Follow existing patterns for API calls (use `/src/api/client.ts`)
6. Ensure proper TypeScript typing throughout

## Related Features

- [Bulk Import](./bulk-import.md): Optional AI-powered bulk song import (complements this feature)
- Song detail pages: Will need to integrate with newly created songs
- Artist pages: Should show newly added songs immediately
