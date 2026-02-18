import Database from "better-sqlite3";
import { drizzle, BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import { runMigrations } from "./migrations";
import path from "path";
import fs from "fs";

let _sqlite: Database.Database | null = null;
let _db: BetterSQLite3Database<typeof schema> | null = null;

function init() {
  if (_sqlite && _db) return { sqlite: _sqlite, db: _db };

  const dbPath = process.env.DATABASE_PATH || "./data/ryla.db";
  const resolvedPath = path.resolve(dbPath);

  // Ensure data directory exists
  const dataDir = path.dirname(resolvedPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  _sqlite = new Database(resolvedPath);
  _sqlite.pragma("busy_timeout = 5000");
  _sqlite.pragma("journal_mode = WAL");
  _sqlite.pragma("foreign_keys = ON");

  runMigrations(_sqlite);

  _db = drizzle(_sqlite, { schema });
  return { sqlite: _sqlite, db: _db };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export const db = new Proxy({} as BetterSQLite3Database<typeof schema>, {
  get(_target, prop) {
    const { db } = init();
    return (db as any)[prop];
  },
});

export const sqlite = new Proxy({} as Database.Database, {
  get(_target, prop) {
    const { sqlite } = init();
    return (sqlite as any)[prop];
  },
});
/* eslint-enable @typescript-eslint/no-explicit-any */
