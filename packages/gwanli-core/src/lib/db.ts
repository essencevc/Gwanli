import Database from "@tursodatabase/turso";

export function initdb(turso_db: string) {
  //@ts-ignore
  const db = new Database(turso_db);

  // Create page table
  const createPageTable = db.prepare(`
    CREATE TABLE IF NOT EXISTS page (
      id TEXT NOT NULL,
      content TEXT NOT NULL,
      lastUpdated TEXT NOT NULL,
      has_database_parent BOOLEAN NOT NULL
    )
  `);

  // Create database table
  const createDatabaseTable = db.prepare(`
    CREATE TABLE IF NOT EXISTS database (
      id TEXT NOT NULL,
      preview TEXT NOT NULL
    )
  `);

  createPageTable.run();
  createDatabaseTable.run();

  return db;
}
