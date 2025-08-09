import { Client } from "@notionhq/client";
import pLimit from "p-limit";
import { dirname, join } from "path";
import {
  initialise_db,
  insertPages,
  insertDatabases,
  insertDatabasePages,
} from "./lib/db.js";
import {
  convertDatabasePageToMarkdown,
  convertPageToMarkdown,
  fetchAllDatabases,
  fetchAllPages,
  generateSlugs,
} from "./lib/notion.js";

export async function indexNotionPages(notionToken: string, db_path: string) {
  const notion = new Client({ auth: notionToken });
  const db = initialise_db(db_path);

  // Assets directory next to the DB
  const assetsDir = join(dirname(db_path), "assets");

  // Rate limit to 2 concurrent requests for Notion API
  const limit = pLimit(2);

  console.log(`Database initialized at ${db_path}`);

  // 1. Fetch all pages
  const { databaseChildren, regularPages } = await fetchAllPages(notion);
  const databases = await fetchAllDatabases(notion);

  // 2. Slugify the pages
  const id_to_slug = generateSlugs(regularPages, databases);

  // 3. Convert regular pages to markdown
  console.log(`Converting ${regularPages.length} pages to markdown...`);
  const conversionPromises = regularPages.map((page) =>
    limit(() => convertPageToMarkdown(notion, page, id_to_slug))
  );

  const convertedPages = await Promise.all(conversionPromises);

  // 4. Insert databases
  insertDatabases(db, databases, id_to_slug);
  console.log(`Inserted ${databases.length} databases into database`);

  const conversionDatabasePromises = databaseChildren.map((child) =>
    limit(() => convertDatabasePageToMarkdown(notion, child, id_to_slug))
  );

  const convertedDatabasePages = await Promise.all(conversionDatabasePromises);

  insertPages(db, convertedPages);

  insertDatabasePages(db, convertedDatabasePages);
  console.log(
    `Inserted ${databaseChildren.length} database pages into database`
  );
}

// Export shared types
export type {
  PageRecord,
  DatabasePageRecord,
  DatabaseRecord,
  ConvertedPage,
} from "./types/database.js";
export type { SlugMapping, IdToSlugMap } from "./types/notion.js";
