import { existsSync, readFileSync, unlinkSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
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
  if (existsSync(DB_PATH)) {
    unlinkSync(DB_PATH);
  }
  const db = new Database(DB_PATH);

  // Execute the initialization SQL
  db.exec(initSql);

  return db;
}

function extractTitleFromPage(page: PageObjectResponse): string {
  const titleProp = Object.values(page.properties).find(
    (prop) => prop.type === "title"
  ) as any;
  return titleProp?.title?.[0]?.plain_text || "Untitled";
}

export function insertPages(
  db: Database.Database,
  convertedPages: ConvertedPage[]
): void {
  if (convertedPages.length === 0) return;

  console.log(`Attempting to insert ${convertedPages.length} pages...`);

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

  console.log(`SQL: ${sql.substring(0, 200)}...`);
  console.log(`First page params:`, params.slice(0, 6));

  try {
    const insertStmt = db.prepare(sql);
    const result = insertStmt.run(...params);
    console.log(`Insert result:`, result);
    console.log(
      `Changes: ${result.changes}, Last insert rowid: ${result.lastInsertRowid}`
    );
  } catch (error) {
    console.error("Error inserting pages:", error);
    throw error;
  }
}

export function insertDatabases(
  db: Database.Database,
  databases: DatabaseObjectResponse[],
  id_to_slug: IdToSlugMap
): void {
  if (databases.length === 0) return;

  console.log(`Attempting to insert ${databases.length} databases...`);

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
    console.log(`Database insert result:`, result);
  } catch (error) {
    console.error("Error inserting databases:", error);
    throw error;
  }
}

export function insertDatabasePages(
  db: Database.Database,
  databasePages: DatabasePageRecord[]
): void {
  if (databasePages.length === 0) return;

  console.log(`Attempting to insert ${databasePages.length} database pages...`);

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
    console.log(`Database pages insert result:`, result);
  } catch (error) {
    console.error("Error inserting database pages:", error);
    throw error;
  }
}
