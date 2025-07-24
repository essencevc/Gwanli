import { Client } from "@notionhq/client";
import { initdb, savePages, saveDatabasePages, saveDatabases } from "./lib/db.js";
import { fetchNotionData, fetchDatabaseChildren, fetchDatabaseInfo, NotionPage } from "./lib/notion.js";

export function helloGwanli(): string {
  return "Hello from Gwanli  - Notion management made simple!";
}

export { NotionPage } from "./lib/notion.js";

export async function indexNotionPages(notionToken: string, turso_db: string) {
  const notion = new Client({ auth: notionToken });
  const db = initdb(turso_db);
  
  // 1. Fetch pages + databases
  const { pages, databases } = await fetchNotionData(notion);
  
  // 2. Fetch database information
  const databaseInfo = await fetchDatabaseInfo(notion, databases);
  
  // 3. Fetch all pages in databases
  const allDatabasePages = [];
  for (const databaseId of databases) {
    const databasePages = await fetchDatabaseChildren(notion, databaseId);
    allDatabasePages.push(...databasePages);
  }
  
  // 4. Save databases, database pages and then save regular pages
  saveDatabases(db, databaseInfo);
  saveDatabasePages(db, allDatabasePages);
  savePages(db, pages);
}
