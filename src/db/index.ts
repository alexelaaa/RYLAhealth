import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import { runMigrations } from "./migrations";
import path from "path";
import fs from "fs";

const dbPath = process.env.DATABASE_PATH || "./data/ryla.db";
const resolvedPath = path.resolve(dbPath);

// Ensure data directory exists (needed during Railway build)
const dataDir = path.dirname(resolvedPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const sqlite = new Database(resolvedPath);
sqlite.pragma("busy_timeout = 5000");
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

runMigrations(sqlite);

export const db = drizzle(sqlite, { schema });
export { sqlite };
