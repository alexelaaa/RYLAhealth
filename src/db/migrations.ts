import type Database from "better-sqlite3";

/**
 * Runs idempotent migrations on the database.
 * Each migration is wrapped in try/catch so it won't fail if the column/table already exists.
 */
export function runMigrations(db: Database.Database) {
  const addColumn = (table: string, column: string, type: string) => {
    try {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
    } catch {
      // Column already exists
    }
  };

  // Migration 1: Add camp assignment columns to campers
  addColumn("campers", "large_group", "TEXT");
  addColumn("campers", "small_group", "TEXT");
  addColumn("campers", "cabin_number", "TEXT");
  addColumn("campers", "bus_number", "TEXT");
  addColumn("campers", "timed_medication_override", "INTEGER DEFAULT 0");

  // Migration 2: Add medication_schedule column
  addColumn("campers", "medication_schedule", "TEXT");

  // Migration 3: Create camper_edits table
  db.exec(`
    CREATE TABLE IF NOT EXISTS camper_edits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      camper_id INTEGER NOT NULL REFERENCES campers(id),
      field_name TEXT NOT NULL,
      old_value TEXT,
      new_value TEXT,
      changed_by TEXT NOT NULL,
      changed_at TEXT NOT NULL
    )
  `);

  // Migration 4: Create check_ins table
  db.exec(`
    CREATE TABLE IF NOT EXISTS check_ins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      camper_id INTEGER NOT NULL UNIQUE REFERENCES campers(id),
      checked_in_at TEXT NOT NULL,
      checked_in_by TEXT NOT NULL,
      notes TEXT
    )
  `);

  // Migration 5: Create bus_waypoints table
  db.exec(`
    CREATE TABLE IF NOT EXISTS bus_waypoints (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bus_id TEXT NOT NULL,
      bus_label TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      accuracy REAL,
      heading REAL,
      speed REAL,
      tracked_by TEXT NOT NULL,
      camp_weekend TEXT,
      client_id TEXT,
      timestamp TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_waypoints_bus_id ON bus_waypoints(bus_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_waypoints_camp_weekend ON bus_waypoints(camp_weekend)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_waypoints_client_id ON bus_waypoints(client_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_waypoints_timestamp ON bus_waypoints(timestamp)`);

  // Migration 6: Create camp_staff table
  db.exec(`
    CREATE TABLE IF NOT EXISTS camp_staff (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      staff_type TEXT NOT NULL,
      staff_role TEXT,
      phone TEXT,
      email TEXT,
      camp_weekend TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_camp_staff_type ON camp_staff(staff_type)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_camp_staff_weekend ON camp_staff(camp_weekend)`);
}
