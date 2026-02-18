#!/bin/bash
# Ensures the database exists on the persistent volume.
# If not, copies the seed database from the build image.

DB_PATH="${DATABASE_PATH:-./data/ryla.db}"
SEED_DB="./scripts/seed-data/ryla.db"

# Ensure data directory exists
mkdir -p "$(dirname "$DB_PATH")"

if [ ! -f "$DB_PATH" ]; then
  if [ -f "$SEED_DB" ]; then
    echo "No database found at $DB_PATH, copying seed database..."
    cp "$SEED_DB" "$DB_PATH"
    echo "Seed database copied."
  else
    echo "No database or seed found, app will create a fresh one."
  fi
else
  echo "Database already exists at $DB_PATH"
fi
