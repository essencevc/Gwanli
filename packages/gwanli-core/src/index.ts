import { Client } from "@notionhq/client";
import pLimit from "p-limit";
import { dirname, join } from "path";
import treeify from "treeify";
import Database from "better-sqlite3";
import {
  initialise_db,
  insertPages,
  insertDatabases,
  insertDatabasePages,
  getAllSlugs,
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

export function listFiles(db_path: string): string {
  const db = new Database(db_path);
  
  try {
    const slugs = getAllSlugs(db);
    
    // Convert slug paths to nested object structure
    const tree: any = {};
    
    for (const slug of slugs) {
      if (!slug) continue;
      
      const parts = slug.split('/').filter(part => part.length > 0);
      let current = tree;
      
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        
        if (i === parts.length - 1) {
          // Last part, set to null
          current[part] = null;
        } else {
          // Intermediate part, create object if doesn't exist
          if (!current[part]) {
            current[part] = {};
          }
          current = current[part];
        }
      }
    }
    
    // Use treeify to visualize the structure
    return treeify.asTree(tree, true, true);
  } finally {
    db.close();
  }
}

// Export shared types
export type {
  PageRecord,
  DatabasePageRecord,
  DatabaseRecord,
  ConvertedPage,
} from "./types/database.js";
export type { SlugMapping, IdToSlugMap } from "./types/notion.js";
