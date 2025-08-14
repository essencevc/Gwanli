import { Client } from "@notionhq/client";
import pLimit from "p-limit";
import treeify from "treeify";
import Database from "better-sqlite3";
import { join } from "path";
import { homedir } from "os";
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
import { buildTree, extractSlugPrefix } from "./lib/tree.js";

export async function indexNotionPages(notionToken: string, db_path: string) {
  const notion = new Client({ auth: notionToken });
  const db = initialise_db(db_path);

  // Rate limit to 2 concurrent requests for Notion API
  const limit = pLimit(2);
  // 1. Fetch all pages
  const { databaseChildren, regularPages } = await fetchAllPages(notion);
  const databases = await fetchAllDatabases(notion);

  // 2. Slugify the pages
  const id_to_slug = generateSlugs(regularPages, databases);
  const conversionPromises = regularPages.map((page) =>
    limit(() => convertPageToMarkdown(notion, page, id_to_slug))
  );

  const convertedPages = await Promise.all(conversionPromises);

  // 4. Insert databases
  insertDatabases(db, databases, id_to_slug);

  const conversionDatabasePromises = databaseChildren.map((child) =>
    limit(() => convertDatabasePageToMarkdown(notion, child, id_to_slug))
  );

  const convertedDatabasePages = await Promise.all(conversionDatabasePromises);

  insertPages(db, convertedPages);

  insertDatabasePages(db, convertedDatabasePages);
}

export function listFiles(
  db_path: string,
  prefix: string = "/",
  maxDepth: number = 2
): string {
  let slugs = [];

  try {
    // Expand ~ to home directory for consistent path handling
    const expandedPath = db_path.startsWith("~/")
      ? join(homedir(), db_path.slice(2))
      : db_path;
    const db = new Database(expandedPath);
    slugs = getAllSlugs(db);
  } catch (error) {
    console.error("Error fetching slugs:", error);
    throw error;
  }

  const { processedPrefix, shortenedPrefix } = extractSlugPrefix(prefix);

  const filteredSlugs = slugs
    .filter((slug) => slug && slug.startsWith(processedPrefix))
    .map((slug) => slug.replace(processedPrefix, shortenedPrefix))
    .sort((a, b) => a.length - b.length);

  const tree = buildTree(filteredSlugs, maxDepth);
  const formattedTree = treeify.asTree(tree, true, true);

  return `
  Showing files from ${prefix} with max depth ${maxDepth}
  - ++ indicates there are more pages/databases to explore from this path.

  ${formattedTree}
  `;
}

// Export config functions
export { loadConfig, checkWorkspace, addWorkspace } from "./config/loader.js";
export type { GwanliConfig, WorkspaceConfig } from "./config/types.js";

// Export shared types
export type {
  PageRecord,
  DatabasePageRecord,
  DatabaseRecord,
  ConvertedPage,
} from "./types/database.js";
export type { SlugMapping, IdToSlugMap } from "./types/notion.js";
