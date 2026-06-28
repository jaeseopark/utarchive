# Database Schema Management

## Overview

utarchive uses PostgreSQL with Drizzle ORM for schema management. All schema changes are versioned through migrations to ensure consistency across environments and deployments.

## Tools

- **Drizzle ORM**: TypeScript-native ORM with zero runtime overhead
- **drizzle-kit**: Migration generation and management CLI
- **drizzle-zod**: Automatic Zod schema derivation from Drizzle schemas

## Schema Change Workflow

### 1. Update the Schema Definition

Edit `backend/src/db/schema.ts` with your changes:

```ts
// Example: adding a new column
export const songs = pgTable('songs', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 500 }).notNull(),
  // ... existing columns ...
  coverArtId: uuid('cover_art_id').references(() => coverArt.id), // NEW
});
```

### 2. Generate the Migration

```bash
cd backend
npx drizzle-kit generate
```

This creates a timestamped SQL file in `backend/migrations/`.

### 3. Review the Generated SQL

Always review the migration file before committing:
- Check for unintended table drops
- Verify foreign key constraints are correct
- Ensure indexes are created where needed

### 4. Test Locally

Apply the migration to your local dev database:

```bash
npx drizzle-kit push
```

Verify the schema change doesn't break existing queries or application logic.

### 5. Commit Both Schema and Migration

Include both files in the same commit/PR:
- `backend/src/db/schema.ts` (updated schema)
- `backend/migrations/<timestamp>_<description>.sql` (generated migration)

## Safe Schema Change Patterns

### ✅ Additive Changes (Safe)

These changes are backward-compatible and safe to deploy:

- **Add new nullable columns**
  ```sql
  ALTER TABLE songs ADD COLUMN cover_art_id UUID;
  ```

- **Add new tables**
  ```sql
  CREATE TABLE cover_art (...);
  ```

- **Add indexes** (use `CONCURRENTLY` in production)
  ```sql
  CREATE INDEX CONCURRENTLY idx_songs_cover_art ON songs(cover_art_id);
  ```

- **Add foreign keys** (if referencing data already exists)
  ```sql
  ALTER TABLE songs ADD CONSTRAINT fk_cover_art 
    FOREIGN KEY (cover_art_id) REFERENCES cover_art(id);
  ```

### ⚠️ Multi-Step Changes (Requires Coordination)

These changes need careful sequencing:

- **Add non-null column**
  1. Add as nullable
  2. Backfill data
  3. Make non-null in a separate migration

- **Rename column**
  1. Add new column
  2. Dual-write to both columns
  3. Backfill old → new
  4. Switch reads to new column
  5. Drop old column

- **Change column type**
  1. Add new column with new type
  2. Dual-write and convert
  3. Backfill
  4. Switch reads
  5. Drop old column

### 🚫 Breaking Changes (Avoid)

Never do these in a single migration:

- **Drop columns** without a deprecation period
- **Drop tables** that are still referenced in deployed code
- **Change NOT NULL constraints** without backfill
- **Remove foreign keys** if app logic depends on them

## Migration Ordering

Migrations must be applied in order. The timestamp prefix ensures correct sequencing:

```
migrations/
  0000_initial_schema.sql         # PR 02
  0001_add_file_metadata.sql      # PR 07 (adds duration, extension, file_size)
  0002_add_cover_art.sql          # PR 22 (adds cover_art table + references)
  0003_add_analytics.sql          # PR 21 (adds listening_analytics table)
```

## Per-PR Schema Changes

Each PR that modifies the database should:

1. Update `backend/src/db/schema.ts`
2. Generate a new migration with `drizzle-kit generate`
3. Add the migration file to the PR
4. Document the change in the PR description
5. Include acceptance criteria that verify the migration works

### Example PR Structure

```
PR 22 — Cover Art Support
Files changed:
  ✓ backend/src/db/schema.ts           (add cover_art table, cover_art_id columns)
  ✓ backend/migrations/0002_add_cover_art.sql
  ✓ backend/src/routes/songs.ts        (API changes)
  ✓ docs/features/22.md                (PR documentation)
```

## Deployment

### Development
```bash
npm run migrate  # or: npx drizzle-kit push
```

### Production

Migrations should be applied automatically before the app starts:

```dockerfile
CMD ["sh", "-c", "npx drizzle-kit push && node dist/index.js"]
```

Or run as a separate init container in Kubernetes.

## Rollback Strategy

If a migration causes issues:

1. **Hotfix**: deploy a compensating migration (don't modify existing migrations)
2. **Revert**: if data loss is acceptable, write a DOWN migration
3. **Forward-fix**: write a new migration that corrects the issue

## Common Patterns

### Adding a Junction Table

```ts
export const songArtists = pgTable('song_artists', {
  songId: uuid('song_id').notNull().references(() => songs.id),
  artistId: uuid('artist_id').notNull().references(() => artists.id),
  displayOrder: integer('display_order').notNull(),
}, (table) => ({
  pk: primaryKey(table.songId, table.artistId),
}));
```

### Adding a JSONB Column

```ts
export const albums = pgTable('albums', {
  // ... other columns ...
  urls: jsonb('urls').$type<Record<string, string>>(),
});
```

### Adding a Full-Text Search Index

```ts
// In schema.ts
export const songs = pgTable('songs', {
  // ... columns ...
  searchVector: text('search_vector'), // computed column
});

// In migration SQL
ALTER TABLE songs ADD COLUMN search_vector tsvector 
  GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, ''))
  ) STORED;

CREATE INDEX idx_songs_search ON songs USING GIN(search_vector);
```

## Troubleshooting

### Migration fails on push

- Check for syntax errors in the generated SQL
- Ensure foreign key references exist
- Verify column types are compatible with Postgres

### Schema drift detected

- Never edit migration files after they've been applied
- Always generate new migrations for changes
- Use `drizzle-kit push` to sync dev DB with schema.ts

### Performance issues after migration

- Add indexes for new foreign keys
- Use `CONCURRENTLY` for index creation on large tables
- Analyze query plans after schema changes

## References

- [Drizzle ORM Docs](https://orm.drizzle.team/)
- [Postgres ALTER TABLE](https://www.postgresql.org/docs/current/sql-altertable.html)
- [Zero-Downtime Migrations](https://www.braintreepayments.com/blog/safe-operations-for-high-volume-postgresql/)
