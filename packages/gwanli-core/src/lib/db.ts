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
import { Logger, defaultLogger } from "../logging/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const initSqlPath = join(__dirname, "../sql/init.sql");
const initSql = readFileSync(initSqlPath, "utf-8");

export function initialise_db(DB_PATH: string, logger?: Logger): Database.Database {
  const log = logger || defaultLogger;
  
  // Expand ~ to home directory
  const expandedPath = DB_PATH.startsWith("~/")
    ? join(homedir(), DB_PATH.slice(2))
    : DB_PATH;

  log.debug(`Initializing database at path: ${expandedPath}`);

  // Ensure the directory exists
  const dbDir = dirname(expandedPath);
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
    log.debug(`Created directory: ${dbDir}`);
  }

  if (existsSync(expandedPath)) {
    unlinkSync(expandedPath);
    log.debug(`Removed existing database file: ${expandedPath}`);
  }
  
  let db: Database.Database;
  try {
    db = new Database(expandedPath);
    log.info(`Database initialized successfully at: ${expandedPath}`);
  } catch (error) {
    log.error("Error initialising database at path:", expandedPath, error);
    throw error;
  }

  // Execute the initialization SQL
  db.exec(initSql);

  return db;
}

export function insertPages(
  db: Database.Database,
  convertedPages: ConvertedPage[],
  logger?: Logger
): void {
  const log = logger || defaultLogger;
  
  if (convertedPages.length === 0) {
    log.debug("No pages to insert");
    return;
  }

  log.debug(`Inserting ${convertedPages.length} pages into database`);

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
    log.info(`Successfully inserted ${convertedPages.length} pages`);
  } catch (error) {
    log.error("Error inserting pages:", error);
    throw error;
  }
}

export function insertDatabases(
  db: Database.Database,
  databases: DatabaseObjectResponse[],
  id_to_slug: IdToSlugMap,
  logger?: Logger
): void {
  const log = logger || defaultLogger;
  
  if (databases.length === 0) {
    log.debug("No databases to insert");
    return;
  }

  log.debug(`Inserting ${databases.length} databases into database`);

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
    log.info(`Successfully inserted ${databases.length} databases`);
  } catch (error) {
    log.error("Error inserting databases:", error);
    throw error;
  }
}

export function insertDatabasePages(
  db: Database.Database,
  databasePages: DatabasePageRecord[],
  logger?: Logger
): void {
  const log = logger || defaultLogger;
  
  if (databasePages.length === 0) {
    log.debug("No database pages to insert");
    return;
  }

  log.debug(`Inserting ${databasePages.length} database pages into database`);

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
    log.info(`Successfully inserted ${databasePages.length} database pages`);
  } catch (error) {
    log.error("Error inserting database pages:", error);
    throw error;
  }
}

export function getAllSlugs(db: Database.Database, logger?: Logger): string[] {
  const log = logger || defaultLogger;
  
  try {
    log.debug("Fetching all slugs from database");
    
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

    log.debug(`Retrieved ${allSlugs.length} slugs (${pageSlugs.length} pages, ${databaseSlugs.length} databases)`);
    return allSlugs;
  } catch (error) {
    log.error("Error fetching slugs:", error);
    throw error;
  }
}
