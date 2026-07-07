#!/bin/sh
set -e

echo "Waiting for database to be ready..."
i=1
while [ $i -le 10 ]; do
  if pg_isready -h db -p 5432 -U postgres 2>/dev/null; then
    echo "Database is ready!"
    break
  fi
  echo "Attempt $i: Database not ready, waiting..."
  sleep 2
  i=$((i+1))
done

echo "Running database migrations..."
# Parse DATABASE_URL to extract connection details
# Format: postgresql://username:password@host:port/database
DB_URL="${DATABASE_URL:-postgresql://postgres:postgres@db:5432/utarchive}"
DB_USER=$(echo "$DB_URL" | sed -n 's/^postgresql:\/\/\([^:]*\):.*/\1/p')
DB_PASSWORD=$(echo "$DB_URL" | sed -n 's/^postgresql:\/\/[^:]*:\([^@]*\)@.*/\1/p')
DB_HOST=$(echo "$DB_URL" | sed -n 's/^postgresql:\/\/[^@]*@\([^:]*\).*/\1/p')
DB_PORT=$(echo "$DB_URL" | sed -n 's/^postgresql:\/\/[^@]*@[^:]*:\([^\/]*\)\/.*/\1/p')
DB_NAME=$(echo "$DB_URL" | sed -n 's/^postgresql:\/\/.*\/\(.*\)$/\1/p')

echo "Applying migrations to $DB_HOST:$DB_PORT/$DB_NAME..."
cd /app/backend

# Apply the migration SQL file
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" < migrations/0000_initial_schema.sql

echo "Migrations completed!"

echo "Starting development servers..."
cd /app
npm run dev:docker
