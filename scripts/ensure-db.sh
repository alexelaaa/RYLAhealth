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

# Run migrations for any new tables
echo "Running migrations..."
sqlite3 "$DB_PATH" "CREATE TABLE IF NOT EXISTS inventory_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_name TEXT NOT NULL,
  category TEXT,
  quantity INTEGER NOT NULL,
  size TEXT,
  unit TEXT,
  notes TEXT,
  entered_by TEXT NOT NULL,
  camp_weekend TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_inventory_weekend ON inventory_items(camp_weekend);
CREATE INDEX IF NOT EXISTS idx_inventory_category ON inventory_items(category);"
echo "Migrations complete."
