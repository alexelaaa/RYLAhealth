import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import { runMigrations } from "./migrations";
import path from "path";

const dbPath = process.env.DATABASE_PATH || "./data/ryla.db";
const resolvedPath = path.resolve(dbPath);

const sqlite = new Database(resolvedPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

runMigrations(sqlite);

export const db = drizzle(sqlite, { schema });
export { sqlite };
