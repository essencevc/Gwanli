import { Client } from "@notionhq/client";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { initdb } from "./lib/db.js";

export function helloGwanli(): string {
  return "Hello from Gwanli  - Notion management made simple!";
}

export interface NotionPage {
  id: string;
  title: string;
  url: string;
  created_time: string;
  last_edited_time: string;
}

async function fetchPages(
  notion: Client,
  filterByDatabaseParent?: boolean,
  offset?: string
): Promise<any[]> {
  console.log(
    "fetchPages called with filterByDatabaseParent:",
    filterByDatabaseParent
  );
  const allPages: any[] = [];
  let cursor = offset;
  let hasMore = true;

  while (hasMore) {
    const response = await notion.search({
      filter: {
        value: "page",
        property: "object",
      },
      start_cursor: cursor,
      page_size: 100,
    });

    // Write response data to file for inspection
    try {
      mkdirSync("./data", { recursive: true });
      writeFileSync(
        join("./data", "pages.json"),
        JSON.stringify(response.results, null, 2)
      );
      console.log("Page data written to ./data/pages.json");
    } catch (error) {
      console.error("Failed to write page data:", error);
    }

    let filteredResults = response.results;

    if (filterByDatabaseParent !== undefined) {
      filteredResults = response.results.filter((page: any) => {
        const hasDbParent = page.parent?.type === "database_id";
        console.log("Page parent:", page.parent); // Debug log to see actual structure
        return filterByDatabaseParent ? hasDbParent : !hasDbParent;
      });
    }

    allPages.push(...filteredResults);

    hasMore = response.has_more;
    cursor = response.next_cursor || undefined;
  }

  return allPages;
}

export async function indexNotionPages(notionToken: string, turso_db: string) {
  const notion = new Client({ auth: notionToken });
  const db = initdb(turso_db);

  // try {
  //   const results = await fetchPages(notion, true);

  //   return results.map((page: any) => ({
  //     id: page.id,
  //     title: getPageTitle(page),
  //     url: page.url,
  //     created_time: page.created_time,
  //     last_edited_time: page.last_edited_time,
  //   }));
  // } catch (error) {
  //   throw new Error(
  //     `Failed to index Notion pages: ${
  //       error instanceof Error ? error.message : "Unknown error"
  //     }`
  //   );
  // }
}

function getPageTitle(page: any): string {
  if (page.properties) {
    // For database pages, look for title property
    const titleProperty = Object.values(page.properties).find(
      (prop: any) => prop.type === "title"
    );
    if (titleProperty && (titleProperty as any).title?.[0]?.plain_text) {
      return (titleProperty as any).title[0].plain_text;
    }
  }

  // For regular pages, use the title from the page object
  if (page.title && page.title[0]?.plain_text) {
    return page.title[0].plain_text;
  }

  return "Untitled";
}
