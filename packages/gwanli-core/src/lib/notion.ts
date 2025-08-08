import { Client } from "@notionhq/client";
import type { 
  SearchResponse, 
  PageObjectResponse, 
  DatabaseObjectResponse
} from "@notionhq/client/build/src/api-endpoints.js";
import pLimit from "p-limit";

// Rate limit to 3 requests per second
const limit = pLimit(2);

export async function fetchAllPages(notion: Client) {
  const allPages: PageObjectResponse[] = [];
  let hasMore = true;
  let nextCursor: string | undefined = undefined;

  console.log("Starting to fetch all Notion pages...");

  while (hasMore) {
    try {
      // Use rate limiting for each request
      const response = await limit(() =>
        notion.search({
          page_size: 100,
          start_cursor: nextCursor,
          filter: {
            property: "object",
            value: "page",
          },
        })
      );

      allPages.push(...(response.results.filter(result => 'properties' in result) as PageObjectResponse[]));
      hasMore = response.has_more;
      nextCursor = response.next_cursor || undefined;

      console.log(
        `Fetched ${response.results.length} pages, total: ${allPages.length}`
      );

      // Small delay between batches to be extra cautious
      if (hasMore) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error("Error fetching pages:", error);
      throw error;
    }
  }

  const databaseChildren = allPages.filter(isDatabaseChild);
  const regularPages = allPages.filter((page) => !isDatabaseChild(page));

  return {
    databaseChildren,
    regularPages,
  };
}

export function isDatabaseChild(page: PageObjectResponse): boolean {
  return page.parent?.type === "database_id";
}

export async function fetchAllDatabases(notion: Client) {
  const allDatabases: DatabaseObjectResponse[] = [];
  let hasMore = true;
  let nextCursor: string | undefined = undefined;

  console.log("Starting to fetch all Notion databases...");

  while (hasMore) {
    try {
      // Use rate limiting for each request
      const response = await limit(() =>
        notion.search({
          page_size: 100,
          start_cursor: nextCursor,
          filter: {
            property: "object",
            value: "database",
          },
        })
      );

      allDatabases.push(...(response.results.filter(result => 'title' in result) as DatabaseObjectResponse[]));
      hasMore = response.has_more;
      nextCursor = response.next_cursor || undefined;

      console.log(
        `Fetched ${response.results.length} databases, total: ${allDatabases.length}`
      );

      // Small delay between batches to be extra cautious
      if (hasMore) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error("Error fetching databases:", error);
      throw error;
    }
  }

  return allDatabases;
}



export function extract_properties(properties: Record<string, any>): Record<string, string> {
  const extracted: Record<string, string> = {};

  for (const [key, value] of Object.entries(properties)) {
    const prop = value;

    switch (prop.type) {
      case "title":
        if (prop.title && prop.title.length > 0) {
          extracted[key] = prop.title[0].plain_text || "";
        }
        break;
      case "rich_text":
        if (prop.rich_text && prop.rich_text.length > 0) {
          extracted[key] = prop.rich_text
            .map((rt: { plain_text?: string }) => rt.plain_text || "")
            .join("");
        }
        break;
      case "select":
        extracted[key] = prop.select?.name || "";
        break;
      case "multi_select":
        extracted[key] =
          prop.multi_select?.map((ms: { name: string }) => ms.name).join(", ") || "";
        break;
      case "date":
        extracted[key] = prop.date?.start || "";
        break;
      case "number":
        extracted[key] = prop.number?.toString() || "";
        break;
      case "checkbox":
        extracted[key] = prop.checkbox ? "true" : "false";
        break;
      case "url":
        extracted[key] = prop.url || "";
        break;
      case "email":
        extracted[key] = prop.email || "";
        break;
      case "phone_number":
        extracted[key] = prop.phone_number || "";
        break;
      default:
        extracted[key] = "";
    }
  }

  return extracted;
}
