import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import Database from "better-sqlite3";
import type { ConvertedPage } from "./notion.js";
import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints.js";

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
      converted.markdown,
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
