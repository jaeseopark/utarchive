# API Endpoint Conventions

## Path Prefix

- All API endpoints must be prefixed with `/api/` to distinguish them from browser routes used by the frontend.

## Domain Grouping

- Similar endpoints should share their own prefixes to group domain-specific operations.

## Response Format

### Arrays Must Be Wrapped

- List endpoints **must** wrap arrays in an object with an appropriate semantic key (not bare arrays).
  - ✅ GOOD: `{ songs: [{...}, {...}] }`
  - ❌ BAD: `[{...}, {...}]`
  - Rationale: Allows for future extensibility (e.g., adding metadata, pagination info) without breaking API contracts.

### Single Objects Are Not Wrapped

- Single object responses (e.g., `GET /api/artists/:id`, `POST /api/songs`) should return the object directly, not wrapped.
  - ✅ GOOD: `{ id: "...", name: "...", ... }`
  - ❌ BAD: `{ artist: { id: "...", name: "...", ... } }`
  - Rationale: Single objects don't have the extensibility need of arrays. Wrapping adds unnecessary nesting.

## Examples

| Endpoint          | Status | Reason                                    |
| ----------------- | ------ | ----------------------------------------- |
| `/api/auth/login` | GOOD   | Auth endpoints grouped under `/api/auth/` |
| `/api/artists`    | GOOD   | Resource endpoints under `/api/`          |
| `/api/tags`       | GOOD   | Utility endpoints under `/api/`           |
| `/auth/login`     | BAD    | missing the required prefix               |
