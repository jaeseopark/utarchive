#!/bin/sh
set -e

echo "Waiting for database to be ready..."
i=1
while [ $i -le 10 ]; do
  if pg_isready -h "${DB_HOST:-localhost}" -p "${DB_PORT:-5432}" -U "${DB_USER:-postgres}" 2>/dev/null; then
    echo "Database is ready!"
    break
  fi
  echo "Attempt $i: Database not ready, waiting..."
  sleep 2
  i=$((i+1))
done

echo "Running database migrations..."
cd /app/backend
npx drizzle-kit migrate

echo "Starting application..."
cd /app/backend
exec node dist/index.js
