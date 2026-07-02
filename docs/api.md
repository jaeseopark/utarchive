# API Endpoint Conventions

## Path Prefix

* All API endpoints must be prefixed with `/api/` to distinguish them from browser routes used by the frontend.

## Domain Grouping

* Similar endpoints should share their own prefixes to group domain-specific operations.

## Examples

| Endpoint | Status | Reason |
|----------|--------|--------|
| `/api/auth/login` | GOOD | Auth endpoints grouped under `/api/auth/` |
| `/api/artists` | GOOD | Resource endpoints under `/api/` |
| `/api/tags` | GOOD | Utility endpoints under `/api/` |
| `/auth/login` | BAD | missing the required prefix |
