# Database Schema Management

## Overview

utarchive uses PostgreSQL with Drizzle ORM and a **schema-first push-based approach** for database management. The schema is defined in TypeScript, and `drizzle-kit push` automatically synchronizes the database to match the current schema definition. There is no manual migration journal tracking.

## Tools & Philosophy

- **Drizzle ORM**: TypeScript-native ORM with zero runtime overhead
- **drizzle-kit push**: Compares the current schema definition against the live database and applies only necessary changes
- **drizzle-zod**: Automatic Zod schema derivation from Drizzle schemas

### Why Push Instead of Migrate?

- **Simpler deployment**: No migration journal file management needed
- **Idempotent**: Safe to run multiple times (restarts, retries, multiple deployments)
- **Schema-as-source-of-truth**: The TypeScript schema file in `backend/src/db/schema.ts` is the authoritative definition
- **No state tracking overhead**: The database introspection determines what has been applied
- **Fresh database friendly**: Works seamlessly on new instances without needing to seed the journal

## Schema Change Workflow

### 1. Update the Schema Definition

Edit `backend/src/db/schema.ts` with your changes:

```ts
// Example: adding a new column
export const songs = pgTable("songs", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 500 }).notNull(),
  // ... existing columns ...
  coverArtId: uuid("cover_art_id").references(() => coverArt.id), // NEW
});
```

### 2. Test Locally

Apply the schema changes to your local dev database:

```bash
cd backend
npx drizzle-kit push
```

This will:

- Introspect the current database schema
- Compare it to your TypeScript schema definition
- Display a preview of changes
- Apply only the necessary DDL statements

Verify the schema change doesn't break existing queries or application logic.

### 3. Generate Migration File (Optional Record-Keeping)

For reference and audit purposes, optionally generate a SQL migration file:

```bash
cd backend
npx drizzle-kit generate
```

This creates a timestamped SQL file in `backend/migrations/` showing what changes were made. **This is informational only** — the migration journal is not used operationally.

### 4. Commit Schema Definition

Commit your updated schema:

```bash
git add backend/src/db/schema.ts
git commit -m "feat: add cover_art_id column to songs table"
```

Generated migration files are optional but can be committed for audit trails.

## Deployment

### Development

The entrypoint script automatically synchronizes the schema on startup:

```bash
npx drizzle-kit push
```

### Production

The production entrypoint runs the same command before starting the app:

```dockerfile
# entrypoint.prod.sh
npx drizzle-kit push
node dist/index.js
```

**Safe for restarts**: If the container restarts mid-deployment, `push` is idempotent and will only apply remaining changes.

## Safe Schema Change Patterns

### ✅ Additive Changes (Always Safe)

These changes are backward-compatible and safe to deploy immediately:

- **Add new nullable columns**

  ```ts
  newColumn: varchar('new_column').default(sql`'default_value'`),
  ```

- **Add new tables**

  ```ts
  export const newTable = pgTable("new_table", {/* columns */});
  ```

- **Add indexes**

  ```ts
  indexes: {
    idx_name: index('idx_name').on(table.columnName),
  }
  ```

- **Add foreign keys** (if referencing data already exists)
  ```ts
  parentId: uuid('parent_id').references(() => parentTable.id),
  ```

### ⚠️ Multi-Step Changes (Requires Code Coordination)

These changes need careful sequencing with code changes:

- **Add non-null column**
  1. Deploy: Add as nullable column + code that populates values
  2. Once data is backfilled, deploy: Change to NOT NULL in schema
  3. Deploy: `npx drizzle-kit push` makes it NOT NULL

- **Rename column** (migration path)
  1. Deploy: Add new column with new name
  2. Deploy: Update code to write to both columns
  3. Once data synced, deploy: Update code to read from new column
  4. Deploy: Update schema to remove old column

- **Change column type**
  1. Deploy: Add new column with new type
  2. Deploy: Update code for dual-write and conversion
  3. Once data is migrated, deploy: Update code to read from new column
  4. Deploy: Update schema to remove old column

### 🚫 Risky Changes (Extra Caution Needed)

These changes require careful planning and validation:

- **Drop columns**: Ensure no deployed code still references them
- **Drop tables**: Ensure no deployed code still depends on them
- **Change NOT NULL constraints**: Backfill data first
- **Change column types**: Use intermediate columns to convert data safely

## Per-PR Schema Changes

Each PR that modifies the database should:

1. Update `backend/src/db/schema.ts`
2. Test with `npx drizzle-kit push` locally
3. Include acceptance criteria that verify the schema change works
4. Document any data migration or backfill logic in the PR description

### Example PR Structure

```
PR #22 — Cover Art Support
Files changed:
  ✓ backend/src/db/schema.ts           (add cover_art table, cover_art_id columns)
  ✓ backend/src/routes/songs.ts        (API changes to handle cover art)
  ✓ docs/features/22.md                (PR documentation)

Testing:
  - Ran `npx drizzle-kit push` locally ✓
  - Verified existing songs still load ✓
  - Tested cover art upload flow ✓
```

## Troubleshooting

### Push Hangs or Fails

If `npx drizzle-kit push` fails to connect or hangs:

1. Verify the database is running: `pg_isready -h db -p 5432`
2. Check DATABASE_URL env var is set correctly
3. Ensure database user has DDL permissions
4. Check PostgreSQL logs: `docker compose logs db`

### Rolling Back a Change

If a schema change causes issues:

1. **Revert the schema file**: `git revert` or `git checkout` the schema change
2. **Run push again**: `npx drizzle-kit push` will undo the unwanted changes
3. **Deploy the fix**: The reverted schema will be applied automatically

## Common Patterns

### Adding a Junction Table

```ts
export const songArtists = pgTable(
  "song_artists",
  {
    songId: uuid("song_id")
      .notNull()
      .references(() => songs.id),
    artistId: uuid("artist_id")
      .notNull()
      .references(() => artists.id),
    displayOrder: integer("display_order").notNull().default(0),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.songId, table.artistId] }),
  }),
);
```

### Adding a JSONB Column

```ts
export const albums = pgTable("albums", {
  // ... other columns ...
  urls: jsonb("urls")
    .$type<Record<string, string>>()
    .notNull()
    .default(sql`'{}'::jsonb`),
});
```

### Adding an Index

```ts
export const songs = pgTable(
  "songs",
  {
    // ... columns ...
  },
  (table) => ({
    idx_title: index("idx_songs_title").on(table.title),
    idx_artist: index("idx_songs_artist_id").on(table.artistId),
  }),
);
```

## Migration File Archive

Old migration files are kept in `backend/migrations/` for historical reference and audit purposes, but they are **not actively used** by the push mechanism. They show what schema changes were made over time.

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
