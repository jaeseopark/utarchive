# Freeform bulk import

## Context

This is an **optional feature** that complements the baseline [Add Song Modal](./add-song-modal.md) experience. While the Add Song Modal allows users to add songs one-by-one through a form, the bulk import feature enables power users to add multiple songs at once using AI-powered extraction.

As a user, I want to be able to copy-paste a freeform string containing information about 0...N songs (ex. html source code for a 'top songs' page or a playlist) and create songs in one go. The string is going to be in an arbitrary format as the source is not limited to a specific website.

I want the import operation to be idempotent based on platform ID (if provided). This implies that the platform id field needs to have the unique constraint in the database (if not already)

This is an optional feature that gets enabled when OPEN_ROUTER_API_KEY is provided as an environment variable. The enabled flag should be determined during the startup and delivered to the frontend so the experience is gated in the UI (i.e. greyed out) for best UX. If the user does not have the key, they will not be able to utilize this optional feature and should use the [Add Song Modal](./add-song-modal.md) to enter songs one-by-one (the default baseline experience).

## proposed flow and important notes

1. when the feature is enabled, the user navigates to the freeform bulk import page within the react application (the exact placement/location to be determined)
2. user pastes a string and clicks OK (length check validation in place to prevent user from entering > 1 million chars) and even if the user somehow bypasses the FE validation, the API will have its own zod schema validation.
3. frontend sends the text to the backend api.
4. backend forwards the text to open router api with the provided api key alongside the shape of songCreateSchema. The AI agent analyzes the input txt and returns a list of 0...N songCreateSchema objects.
5. The api adds songCreateSchema + { platformIdExists: boolean} to each element. where platformIdExists is determined by duplicate check in the songs table.
6. the API then forwards the resulting array to the frontend for the user to review. This whole route interaction is going to be at most 30 seconds, so it's okay to implement it in a single api call, but websocket interaction would be ideal to send progress updates to the FE.
7. user gets to review the result. Because the import can detect many songs, accepting them all at once and finding them later to edit/update is going to be difficult. As such, the review process should encourage reviewing/editing right in place before accepting a song (perhaps use react hook form or similar solution so each individual field can be edited with ease).
8. upon accepting, the Create Song request should be sent to the API and the rest of data management is the same as any other song.
9. the platform ID duplicate warning gets displayed to the user (user can still try and submit the song if they wish, but since the database has the unique constraint, the request will be rejected by the backend.)
