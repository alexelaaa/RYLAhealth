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

  // Migration 7: Add new camper columns for cabin/bus details
  addColumn("campers", "cabin_name", "TEXT");
  addColumn("campers", "cabin_location", "TEXT");
  addColumn("campers", "bus_stop", "TEXT");
  addColumn("campers", "bus_stop_location", "TEXT");
  addColumn("campers", "bus_stop_address", "TEXT");
  addColumn("campers", "pickup_time", "TEXT");
  addColumn("campers", "dropoff_time", "TEXT");

  // Migration 8: Add insurance, permissions, and meta columns
  addColumn("campers", "has_insurance", "TEXT");
  addColumn("campers", "insurance_provider", "TEXT");
  addColumn("campers", "policy_number", "TEXT");
  addColumn("campers", "insured_first_name", "TEXT");
  addColumn("campers", "insured_last_name", "TEXT");
  addColumn("campers", "insurance_phone", "TEXT");
  addColumn("campers", "first_aid_permission", "TEXT");
  addColumn("campers", "otc_medication_permission", "TEXT");
  addColumn("campers", "waiver_agreement", "TEXT");
  addColumn("campers", "code_of_ethics", "TEXT");
  addColumn("campers", "registration_time", "TEXT");
  addColumn("campers", "has_relative_attending", "TEXT");
  addColumn("campers", "relative_first_name", "TEXT");
  addColumn("campers", "relative_last_name", "TEXT");
  addColumn("campers", "relative_role", "TEXT");
  addColumn("campers", "rotary_club_confirmed", "TEXT");
  addColumn("campers", "camp_date_flexibility", "TEXT");
  addColumn("campers", "address_street", "TEXT");
  addColumn("campers", "address_city", "TEXT");
  addColumn("campers", "address_state", "TEXT");
  addColumn("campers", "address_zip", "TEXT");

  // Migration 9: Add no_show column to campers
  addColumn("campers", "no_show", "INTEGER DEFAULT 0");

  // Migration 10: Add camp arrival columns to check_ins
  addColumn("check_ins", "camp_arrived_at", "TEXT");
  addColumn("check_ins", "camp_arrived_by", "TEXT");

  // Migration 11: Rebuild staff_pins to allow 'bussing' role (SQLite can't alter CHECK constraints)
  try {
    const hasOldConstraint = db.prepare(
      `SELECT sql FROM sqlite_master WHERE type='table' AND name='staff_pins'`
    ).get() as { sql: string } | undefined;
    if (hasOldConstraint?.sql && !hasOldConstraint.sql.includes("'bussing'")) {
      db.exec(`
        CREATE TABLE staff_pins_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          label TEXT NOT NULL UNIQUE,
          pin_hash TEXT NOT NULL,
          role TEXT NOT NULL CHECK(role IN ('nurse', 'staff', 'admin', 'bussing'))
        )
      `);
      db.exec(`INSERT INTO staff_pins_new SELECT * FROM staff_pins`);
      db.exec(`DROP TABLE staff_pins`);
      db.exec(`ALTER TABLE staff_pins_new RENAME TO staff_pins`);
    }
  } catch {
    // Already migrated
  }

  // Migration 12: Create app_settings key-value table
  db.exec(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_by TEXT,
      updated_at TEXT
    )
  `);

  // Migration 13: Create small_group_info table
  db.exec(`
    CREATE TABLE IF NOT EXISTS small_group_info (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_number INTEGER,
      small_group TEXT UNIQUE NOT NULL,
      large_group TEXT,
      meeting_location TEXT,
      dgl_first_name TEXT,
      dgl_last_name TEXT,
      dgl_cabin TEXT,
      dgl_gender TEXT,
      camper_count INTEGER,
      male_count INTEGER,
      female_count INTEGER,
      camp_weekend TEXT,
      created_at TEXT NOT NULL
    )
  `);

  // Migration 14: Create cabin_checkins table
  db.exec(`
    CREATE TABLE IF NOT EXISTS cabin_checkins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      camper_id INTEGER NOT NULL REFERENCES campers(id),
      night TEXT NOT NULL CHECK(night IN ('friday', 'saturday')),
      present INTEGER NOT NULL DEFAULT 0,
      checked_by TEXT NOT NULL,
      camp_weekend TEXT NOT NULL,
      checked_at TEXT NOT NULL
    )
  `);
  db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_cabin_checkins_unique ON cabin_checkins(camper_id, night, camp_weekend)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_cabin_checkins_camper ON cabin_checkins(camper_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_cabin_checkins_weekend ON cabin_checkins(camp_weekend)`);

  // Migration 15: Normalize spacing in small_group_info (add space between number and letter)
  try {
    // Fix dgl_cabin: "Cabin 17C" → "Cabin 17 C"
    const cabinRows = db.prepare(
      `SELECT id, dgl_cabin FROM small_group_info WHERE dgl_cabin IS NOT NULL`
    ).all() as { id: number; dgl_cabin: string }[];
    const updateCabin = db.prepare(`UPDATE small_group_info SET dgl_cabin = ? WHERE id = ?`);
    for (const row of cabinRows) {
      const fixed = row.dgl_cabin.replace(/(\d)([A-Za-z])/g, "$1 $2");
      if (fixed !== row.dgl_cabin) {
        updateCabin.run(fixed, row.id);
      }
    }
    // Fix meeting_location: remove trailing periods, normalize spacing
    const locRows = db.prepare(
      `SELECT id, meeting_location FROM small_group_info WHERE meeting_location IS NOT NULL`
    ).all() as { id: number; meeting_location: string }[];
    const updateLoc = db.prepare(`UPDATE small_group_info SET meeting_location = ? WHERE id = ?`);
    for (const row of locRows) {
      let fixed = row.meeting_location.replace(/\.\s*$/, "");
      fixed = fixed.replace(/(\d)([A-Za-z])/g, "$1 $2");
      if (fixed !== row.meeting_location) {
        updateLoc.run(fixed, row.id);
      }
    }
  } catch {
    // Table may not exist yet
  }

  // Migration 16: Rebuild staff_pins to allow 'dgl' role
  try {
    const pinTableDef = db.prepare(
      `SELECT sql FROM sqlite_master WHERE type='table' AND name='staff_pins'`
    ).get() as { sql: string } | undefined;
    if (pinTableDef?.sql && !pinTableDef.sql.includes("'dgl'")) {
      db.exec(`
        CREATE TABLE staff_pins_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          label TEXT NOT NULL UNIQUE,
          pin_hash TEXT NOT NULL,
          role TEXT NOT NULL CHECK(role IN ('nurse', 'staff', 'admin', 'bussing', 'dgl'))
        )
      `);
      db.exec(`INSERT INTO staff_pins_new SELECT * FROM staff_pins`);
      db.exec(`DROP TABLE staff_pins`);
      db.exec(`ALTER TABLE staff_pins_new RENAME TO staff_pins`);
    }
  } catch {
    // Already migrated
  }

  // Migration 17: Rebuild staff_pins to allow 'alumni' role
  try {
    const pinTableDef2 = db.prepare(
      `SELECT sql FROM sqlite_master WHERE type='table' AND name='staff_pins'`
    ).get() as { sql: string } | undefined;
    if (pinTableDef2?.sql && !pinTableDef2.sql.includes("'alumni'")) {
      db.exec(`
        CREATE TABLE staff_pins_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          label TEXT NOT NULL UNIQUE,
          pin_hash TEXT NOT NULL,
          role TEXT NOT NULL CHECK(role IN ('nurse', 'staff', 'admin', 'bussing', 'dgl', 'alumni'))
        )
      `);
      db.exec(`INSERT INTO staff_pins_new SELECT * FROM staff_pins`);
      db.exec(`DROP TABLE staff_pins`);
      db.exec(`ALTER TABLE staff_pins_new RENAME TO staff_pins`);
    }
  } catch {
    // Already migrated
  }

  // Migration 18: Push subscriptions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      endpoint TEXT NOT NULL UNIQUE,
      subscription_json TEXT NOT NULL,
      user_label TEXT NOT NULL,
      role TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);

  // Migration 19: Bus check-in status table
  db.exec(`
    CREATE TABLE IF NOT EXISTS bus_checkin_status (
      bus_number TEXT PRIMARY KEY,
      completed_at TEXT NOT NULL,
      completed_by TEXT NOT NULL
    )
  `);

  // Migration 20: Help tickets table
  db.exec(`
    CREATE TABLE IF NOT EXISTS help_tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cabin TEXT NOT NULL,
      dgl_name TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      urgency TEXT NOT NULL DEFAULT 'normal',
      status TEXT NOT NULL DEFAULT 'open',
      resolved_by TEXT,
      resolved_note TEXT,
      resolved_at TEXT,
      created_at TEXT NOT NULL
    )
  `);

  // Migration 21: Rebuild cabin_checkins to allow 'arrival' night value
  try {
    const ccDef = db.prepare(
      `SELECT sql FROM sqlite_master WHERE type='table' AND name='cabin_checkins'`
    ).get() as { sql: string } | undefined;
    if (ccDef?.sql && !ccDef.sql.includes("'arrival'")) {
      db.exec(`
        CREATE TABLE cabin_checkins_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          camper_id INTEGER NOT NULL REFERENCES campers(id),
          night TEXT NOT NULL CHECK(night IN ('arrival', 'friday', 'saturday')),
          present INTEGER NOT NULL DEFAULT 0,
          checked_by TEXT NOT NULL,
          camp_weekend TEXT NOT NULL,
          checked_at TEXT NOT NULL
        )
      `);
      db.exec(`INSERT INTO cabin_checkins_new SELECT * FROM cabin_checkins`);
      db.exec(`DROP TABLE cabin_checkins`);
      db.exec(`ALTER TABLE cabin_checkins_new RENAME TO cabin_checkins`);
      db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_cabin_checkins_unique ON cabin_checkins(camper_id, night, camp_weekend)`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_cabin_checkins_camper ON cabin_checkins(camper_id)`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_cabin_checkins_weekend ON cabin_checkins(camp_weekend)`);
    }
  } catch {
    // Already migrated
  }

  // Migration 22: Announcements table
  db.exec(`
    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      priority TEXT NOT NULL DEFAULT 'normal',
      posted_by TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    )
  `);
}
