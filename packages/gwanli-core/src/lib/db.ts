import { existsSync, readFileSync, unlinkSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { homedir } from "os";
import Database from "better-sqlite3";
import type { ConvertedPage, DatabasePageRecord } from "../types/database.js";
import type { IdToSlugMap } from "../types/notion.js";
import type {
  PageObjectResponse,
  DatabaseObjectResponse,
} from "@notionhq/client/build/src/api-endpoints.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const initSqlPath = join(__dirname, "../sql/init.sql");
const initSql = readFileSync(initSqlPath, "utf-8");

export function initialise_db(DB_PATH: string): Database.Database {
  // Expand ~ to home directory
  const expandedPath = DB_PATH.startsWith("~/")
    ? join(homedir(), DB_PATH.slice(2))
    : DB_PATH;

  // Ensure the directory exists
  const dbDir = dirname(expandedPath);
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
  }

  if (existsSync(expandedPath)) {
    unlinkSync(expandedPath);
  }
  let db: Database.Database;
  try {
    db = new Database(expandedPath);
  } catch (error) {
    console.error("Error initialising database at path:", expandedPath, error);
    throw error;
  }

  // Execute the initialization SQL
  db.exec(initSql);

  return db;
}

export function insertPages(
  db: Database.Database,
  convertedPages: ConvertedPage[]
): void {
  if (convertedPages.length === 0) return;

  const values = convertedPages.map(() => `(?, ?, ?, ?, ?, ?)`).join(", ");

  const sql = `
    INSERT OR REPLACE INTO page (id, title, content, slug, createdAt, lastUpdated)
    VALUES ${values}
  `;

  const params = convertedPages.flatMap((converted, index) => {
    return [
      converted.id,
      converted.title,
      converted.content,
      converted.slug,
      converted.createdAt,
      converted.lastUpdated,
    ];
  });

  try {
    const insertStmt = db.prepare(sql);
    insertStmt.run(...params);
  } catch (error) {
    throw error;
  }
}

export function insertDatabases(
  db: Database.Database,
  databases: DatabaseObjectResponse[],
  id_to_slug: IdToSlugMap
): void {
  if (databases.length === 0) return;

  const values = databases.map(() => `(?, ?, ?, ?, ?, ?)`).join(", ");

  const sql = `
    INSERT OR REPLACE INTO database (id, title, slug, properties, createdAt, lastUpdated)
    VALUES ${values}
  `;

  const params = databases.flatMap((database) => {
    const title = database.title?.[0]?.plain_text || "Untitled";
    return [
      database.id,
      title,
      id_to_slug[database.id].slug || "",
      JSON.stringify(database.properties),
      database.created_time,
      database.last_edited_time,
    ];
  });

  try {
    const insertStmt = db.prepare(sql);
    const result = insertStmt.run(...params);
  } catch (error) {
    throw error;
  }
}

export function insertDatabasePages(
  db: Database.Database,
  databasePages: DatabasePageRecord[]
): void {
  if (databasePages.length === 0) return;

  const values = databasePages.map(() => `(?, ?, ?, ?, ?)`).join(", ");

  const sql = `
    INSERT OR REPLACE INTO database_page (id, properties, content, createdAt, lastUpdated)
    VALUES ${values}
  `;

  const params = databasePages.flatMap((page) => {
    // Extract properties as JSON

    return [
      page.id,
      JSON.stringify(page.properties),
      page.content,
      page.createdAt,
      page.lastUpdated,
    ];
  });

  try {
    const insertStmt = db.prepare(sql);
    const result = insertStmt.run(...params);
  } catch (error) {
    throw error;
  }
}

export function getAllSlugs(db: Database.Database): string[] {
  try {
    // Get slugs from page table
    const pageStmt = db.prepare("SELECT slug FROM page");
    const pageSlugs = pageStmt.all() as { slug: string }[];

    // Get slugs from database table
    const databaseStmt = db.prepare("SELECT slug FROM database");
    const databaseSlugs = databaseStmt.all() as { slug: string }[];

    // Combine and add visual indicators
    const allSlugs = [
      ...pageSlugs.map((row) => row.slug),
      ...databaseSlugs.map((row) => row.slug),
    ];

    return allSlugs;
  } catch (error) {
    console.error("Error fetching slugs:", error);
    throw error;
  }
}
