import { Client } from "@notionhq/client";
import { initialise_db } from "./lib/db.js";
import { fetchAllDatabases, fetchAllPages } from "./lib/notion.js";

export async function indexNotionPages(notionToken: string, db_path: string) {
  const notion = new Client({ auth: notionToken });
  const db = initialise_db(db_path);

  console.log(`Database initialized at ${db_path}`);

  // 1. Fetch all pages
  // const { databaseChildren, regularPages } = await fetchAllPages(notion);
  const databases = await fetchAllDatabases(notion);

  console.log(`Retrieved ${databases.length} databases from Notion`);

  // Write databases to data.json
  const fs = await import("fs/promises");
  const path = await import("path");

  const dataDir = path.join(process.cwd(), "database.json");
  await fs.writeFile(dataDir, JSON.stringify({ databases }, null, 2));
  console.log(`Wrote ${databases.length} databases to ${dataDir}`);

  // TODO: Process and save pages to database
  // return { databaseChildren, regularPages };

  // // 2. Fetch database information
  // const databaseInfo = await fetchDatabaseInfo(notion, databases);

  // // 3. Fetch all pages in databases
  // const allDatabasePages = [];
  // for (const databaseId of databases) {
  //   const databasePages = await fetchDatabaseChildren(notion, databaseId);
  //   allDatabasePages.push(...databasePages);
  // }

  // // 4. Save databases, database pages and then save regular pages
  // saveDatabases(db, databaseInfo);
  // saveDatabasePages(db, allDatabasePages);
  // savePages(db, pages);
}
