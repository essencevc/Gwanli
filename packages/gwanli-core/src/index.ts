import { Client } from "@notionhq/client";
import pLimit from "p-limit";
import { initialise_db, insertPage, insertPages } from "./lib/db.js";
import {
  convertPageToMarkdown,
  fetchAllDatabases,
  fetchAllPages,
  generateSlugs,
} from "./lib/notion.js";

export async function indexNotionPages(notionToken: string, db_path: string) {
  const notion = new Client({ auth: notionToken });
  const db = initialise_db(db_path);

  // Rate limit to 2 concurrent requests
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
  insertPages(db, convertedPages);
  console.log(`Inserted ${convertedPages.length} pages into database`);
}
