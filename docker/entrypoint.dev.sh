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

echo "Synchronizing database schema..."
cd /app/backend
npx drizzle-kit push

echo "Starting development servers..."
cd /app
npm run dev:docker
