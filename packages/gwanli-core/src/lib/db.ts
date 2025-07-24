import Database, { type Database as DatabaseType } from "better-sqlite3";
import { readFileSync, existsSync, unlinkSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { z } from "zod";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const NotionPage = z.object({
  id: z.string(),
  title: z.string().optional(),
  content: z.string(),
  lastUpdated: z.string(),
});

export function initdb(db_path: string): DatabaseType {
  console.log(`Initializing database at: ${db_path}`);
  // Delete existing database if it exists
  if (existsSync(db_path)) {
    unlinkSync(db_path);
  }

  const db = new Database(db_path);

  // Read and execute init.sql
  const initSql = readFileSync(join(__dirname, "init.sql"), "utf-8");
  db.exec(initSql);

  return db;
}

export function savePages(db: DatabaseType, pages: unknown[]) {
  const validatedPages = z.array(NotionPage).parse(pages);

  const insertStmt = db.prepare(`
    INSERT INTO page (id, title, content, lastUpdated)
    VALUES (?, ?, ?, ?)
  `);

  for (const page of validatedPages) {
    insertStmt.run(
      page.id,
      page.title || null,
      page.content,
      page.lastUpdated
    );
  }
}

export function saveDatabasePages(db: DatabaseType, databasePages: unknown[]) {
  const DatabasePageSchema = z.object({
    id: z.string(),
    title: z.string().optional(),
    content: z.string().default(""),
    lastUpdated: z.string(),
    database_order: z.number().int().optional()
  });

  const validatedPages = z.array(DatabasePageSchema).parse(databasePages);

  const insertStmt = db.prepare(`
    INSERT INTO database_page (id, title, content, lastUpdated, database_order)
    VALUES (?, ?, ?, ?, ?)
  `);

  for (const page of validatedPages) {
    insertStmt.run(
      page.id,
      page.title || null,
      page.content,
      page.lastUpdated,
      page.database_order || null
    );
  }
}

export function saveDatabases(db: DatabaseType, databases: unknown[]) {
  const DatabaseSchema = z.object({
    id: z.string(),
    title: z.string().optional(),
    lastUpdated: z.string(),
    properties: z.record(z.any())
  });

  const validatedDatabases = z.array(DatabaseSchema).parse(databases);

  const insertStmt = db.prepare(`
    INSERT INTO database (id, title, lastUpdated, properties)
    VALUES (?, ?, ?, ?)
  `);

  for (const database of validatedDatabases) {
    insertStmt.run(
      database.id,
      database.title || null,
      database.lastUpdated,
      JSON.stringify(database.properties)
    );
  }
}
