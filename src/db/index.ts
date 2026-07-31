import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import fs from "node:fs";
import path from "node:path";
import * as schema from "./schema";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = process.env.RESUMECANDY_DB_PATH ?? path.join(DATA_DIR, "resumecandy.db");

function createDb() {
  if (DB_PATH !== ":memory:") {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  }
  const sqlite = new Database(DB_PATH);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  return db;
}

// Survive dev-server module reloads without piling up connections.
const globalForDb = globalThis as unknown as {
  __resumecandyDb?: ReturnType<typeof createDb>;
};

export const db = globalForDb.__resumecandyDb ?? (globalForDb.__resumecandyDb = createDb());

export * as tables from "./schema";
