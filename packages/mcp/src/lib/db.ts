import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const Database = require("@tursodatabase/turso");

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function init_db(db_location: string): typeof Database.Database {
  // Set experimental features
  process.env.TURSO_EXPERIMENTAL_INDEXES = "1";
  
  const db = new Database(db_location);

  // Read SQL from constants file
  const initSqlPath = join(__dirname, "../constants/init.sql");
  const initSql = readFileSync(initSqlPath, "utf-8");

  // Execute the initialization SQL
  db.exec(initSql);

  return db;
}

export function get_db(db_location: string): typeof Database.Database {
  return new Database(db_location);
}
