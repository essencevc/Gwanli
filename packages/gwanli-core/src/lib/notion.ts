import { Client } from "@notionhq/client";
import type {
  SearchResponse,
  PageObjectResponse,
  DatabaseObjectResponse,
} from "@notionhq/client/build/src/api-endpoints.js";
import { NotionToMarkdown } from "notion-to-md";
import pLimit from "p-limit";
import { markdownTable } from "markdown-table";

// Rate limit to 3 requests per second
const limit = pLimit(2);

// Function to create formatted markdown table
function createDatabaseTable(
  title: string,
  headers: string[],
  rows: any[]
): string {
  if (headers.length === 0 || rows.length === 0) {
    return `## ${title}\n\n*No entries found*`;
  }

  // Create table data with headers as first row
  const tableData = [
    headers,
    ...rows.map((row) =>
      headers.map((header) => {
        const value = String(row.properties[header] || "");
        return value.length > 50 ? value.slice(0, 47) + "..." : value;
      })
    ),
  ];

  return `## ${title}\n\n${markdownTable(tableData)}`;
}

export async function fetchAllPages(notion: Client) {
  const allPages: PageObjectResponse[] = [];
  let hasMore = true;
  let nextCursor: string | undefined = undefined;

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

      allPages.push(
        ...(response.results.filter(
          (result) => "properties" in result
        ) as PageObjectResponse[])
      );
      hasMore = response.has_more;
      nextCursor = response.next_cursor || undefined;

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

      allDatabases.push(
        ...(response.results.filter(
          (result) => "title" in result
        ) as DatabaseObjectResponse[])
      );
      hasMore = response.has_more;
      nextCursor = response.next_cursor || undefined;

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

export function extract_properties(
  properties: Record<string, any>
): Record<string, string> {
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
          prop.multi_select
            ?.map((ms: { name: string }) => ms.name)
            .join(", ") || "";
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

function sanitizeSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function extractTitle(
  item: PageObjectResponse | DatabaseObjectResponse
): string {
  if ("title" in item) {
    // Database
    return item.title?.[0]?.plain_text || "untitled";
  } else {
    // Page
    const titleProp = Object.values(item.properties).find(
      (prop) => prop.type === "title"
    ) as any;
    return titleProp?.title?.[0]?.plain_text || "untitled";
  }
}

function isWorkspaceRoot(
  item: PageObjectResponse | DatabaseObjectResponse
): boolean {
  return item.parent?.type === "workspace";
}

function getParentId(
  item: PageObjectResponse | DatabaseObjectResponse
): string | null {
  if (item.parent?.type === "page_id") {
    return item.parent.page_id;
  }
  return null;
}

export function generateSlugs(
  pages: PageObjectResponse[],
  databases: DatabaseObjectResponse[]
): Record<string, string> {
  const items = [...pages, ...databases];
  const slugMap: Record<string, string> = {};
  const usedSlugs = new Set<string>();

  function processItems(
    currentParent: string | null,
    parentSlug: string = ""
  ): void {
    // Find items with the current parent
    const children = items.filter((item) => {
      if (currentParent === null) {
        return isWorkspaceRoot(item);
      }
      return getParentId(item) === currentParent;
    });

    for (const item of children) {
      const title = extractTitle(item);
      let slug = sanitizeSlug(title);

      // Handle duplicates by adding suffix
      let finalSlug = slug;
      let counter = 1;
      while (usedSlugs.has(parentSlug + "/" + finalSlug)) {
        finalSlug = `${slug}-${counter}`;
        counter++;
      }

      const fullSlug = parentSlug + "/" + finalSlug;
      slugMap[item.id] = fullSlug;
      usedSlugs.add(fullSlug);

      // Recursively process children of this item
      processItems(item.id, fullSlug);
    }
  }

  // Start with workspace root items
  processItems(null);

  return slugMap;
}

export interface ConvertedPage {
  id: string;
  markdown: string;
  slug: string;
  createdAt: string;
  lastUpdated: string;
  title: string;
}

export async function convertPageToMarkdown(
  notion: Client,
  page: PageObjectResponse,
  id_to_slug: Record<string, string>
): Promise<ConvertedPage> {
  // Initialize notion-to-markdown with config to disable child page parsing
  const n2m = new NotionToMarkdown({
    notionClient: notion,
  });

  // Custom transformer for child_database blocks - render as links
  n2m.setCustomTransformer("child_database", async (block) => {
    const { child_database } = block as any;
    const id = block.id;
    const title = child_database?.title || "Untitled Database";

    try {
      // Query the database to get first 3 created entries
      const response = await notion.databases.query({
        database_id: id,
        page_size: 3,
        sorts: [
          {
            timestamp: "created_time",
            direction: "ascending",
          },
        ],
      });
      const rows = response.results.map((item) => {
        return {
          id: item.id,
          //@ts-ignore
          properties: extract_properties(item.properties),
        };
      });

      // Extract headers from first row
      const headers = rows.length > 0 ? Object.keys(rows[0].properties) : [];

      // Use markdown-table to render the database as a formatted table
      return createDatabaseTable(
        `${title} (Database Id: ${id})`,
        headers,
        rows
      );
    } catch (error) {
      console.warn(`Could not fetch database entries for ${id}:`, error);
      return createDatabaseTable(title, [], []);
    }
  });

  n2m.setCustomTransformer("child_page", async (block) => {
    //@ts-ignore
    return `[${block.child_page?.title || "Untitled Page"}](${
      id_to_slug[block.id]
    })`;
  });
  const mdBlocks = await n2m.pageToMarkdown(page.id);

  // @ts-ignore
  const title = page.properties.title.title[0].plain_text;

  // Build a simple markdown string that includes child_page links
  const markdownContent = mdBlocks
    .map((block) => block.parent) // parent already contains your custom markdown
    .filter(Boolean)
    .join("\n\n");

  return {
    id: page.id,
    markdown: `${title}\n\n${markdownContent}`,
    title,
    slug: id_to_slug[page.id],
    createdAt: page.created_time,
    lastUpdated: page.last_edited_time,
  };
}
