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
  // Several processes can open the file at once (the build's page-data
  // workers, a dev server next to a test run); wait for a lock instead of
  // failing on the first SQLITE_BUSY.
  sqlite.pragma("busy_timeout = 5000");
  const db = drizzle(sqlite, { schema });
  runMigrations(db);
  return db;
}

function runMigrations(db: ReturnType<typeof drizzle<typeof schema>>) {
  const migrationsFolder = path.join(process.cwd(), "drizzle");
  try {
    migrate(db, { migrationsFolder });
  } catch (error) {
    // Two processes migrating a brand-new file can both read "nothing applied"
    // and race; the loser fails on a table the winner just created. A second
    // pass reads the winner's journal and has nothing left to do.
    migrate(db, { migrationsFolder });
    console.warn("Migration retried after a concurrent run:", error);
  }
}

// Survive dev-server module reloads without piling up connections.
const globalForDb = globalThis as unknown as {
  __resumecandyDb?: ReturnType<typeof createDb>;
};

const cached = globalForDb.__resumecandyDb;
// A dev reload can bring new migrations with it while the cached connection
// lives on; applying them here (a no-op when there are none) keeps the schema
// and the code in step without a server restart.
if (cached) runMigrations(cached);

export const db = cached ?? (globalForDb.__resumecandyDb = createDb());

export * as tables from "./schema";
