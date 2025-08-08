import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import Database from "better-sqlite3";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const initSqlPath = join(__dirname, "../sql/init.sql");
const initSql = readFileSync(initSqlPath, "utf-8");

export function initialise_db(DB_PATH: string): Database.Database {
  const db = new Database(DB_PATH);

  // Execute the initialization SQL
  db.exec(initSql);

  return db;
}
