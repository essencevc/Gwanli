import { Client } from "@notionhq/client";
import type {
  SearchResponse,
  PageObjectResponse,
  DatabaseObjectResponse,
} from "@notionhq/client/build/src/api-endpoints.js";
import { NotionToMarkdown } from "notion-to-md";
import pLimit from "p-limit";
import { markdownTable } from "markdown-table";
import type { IdToSlugMap } from "../types/notion.js";
import type { PageRecord, DatabasePageRecord } from "../types/database.js";
import { JobTracker } from "./jobs.js";
import {
  initialise_db,
  insertPages,
  insertDatabases,
  insertDatabasePages,
} from "./db.js";

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

export async function fetchAllPages(notion: Client, jobTracker: JobTracker) {
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
      jobTracker.error("Error fetching pages:", error);
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

export async function fetchAllDatabases(notion: Client, jobTracker: JobTracker) {
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
      jobTracker.error("Error fetching databases:", error);
      throw error;
    }
  }

  return allDatabases;
}

export function processProperties(
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
): IdToSlugMap {
  const items = [...pages, ...databases];
  const slugMap: IdToSlugMap = {};
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
      slugMap[item.id] = {
        slug: fullSlug,
        name: title,
      };
      usedSlugs.add(fullSlug);

      // Recursively process children of this item
      processItems(item.id, fullSlug);
    }
  }

  // Start with workspace root items
  processItems(null);

  return slugMap;
}

function processNotionLinks(
  markdownContent: string,
  id_to_slug: IdToSlugMap
): string {
  return markdownContent.replace(
    /\[([^\]]*)\]\(https:\/\/www\.notion\.so\/[^\/]*\/([a-f0-9]{32})[^\)]*\)/g,
    (match: string, linkText: string, pageId: string) => {
      if (id_to_slug[pageId]) {
        return `[${linkText}](${id_to_slug[pageId].slug})`;
      }
      return match; // Return original if no mapping found
    }
  );
}

export async function convertPageToMarkdown(
  notion: Client,
  page: PageObjectResponse,
  id_to_slug: IdToSlugMap,
  jobTracker: JobTracker
): Promise<PageRecord> {
  const n2m = initializeMarkdownConverter(notion, id_to_slug, jobTracker);
  const mdBlocks = await n2m.pageToMarkdown(page.id);

  // Extract title from regular page
  // @ts-ignore
  const title = page.properties.title?.title?.[0]?.plain_text || "untitled";

  // Build markdown content
  let markdownContent = mdBlocks
    .map((block) => block.parent)
    .filter(Boolean)
    .join("\n\n");

  // Process notion.so links
  markdownContent = processNotionLinks(markdownContent, id_to_slug);

  return {
    id: page.id,
    title,
    content: `${title}\n\n${markdownContent}`,
    slug: id_to_slug[page.id].slug,
    createdAt: page.created_time,
    lastUpdated: page.last_edited_time,
  };
}

export async function convertDatabasePageToMarkdown(
  notion: Client,
  page: PageObjectResponse,
  id_to_slug: IdToSlugMap,
  jobTracker: JobTracker
): Promise<DatabasePageRecord> {
  const n2m = initializeMarkdownConverter(notion, id_to_slug, jobTracker);
  const mdBlocks = await n2m.pageToMarkdown(page.id);

  // Process properties for database page
  const properties = processProperties(page.properties);

  // Build markdown content
  let markdownContent = mdBlocks
    .map((block) => block.parent)
    .filter(Boolean)
    .join("\n\n");

  // Process notion.so links
  markdownContent = processNotionLinks(markdownContent, id_to_slug);

  return {
    id: page.id,
    properties,
    content: markdownContent,
    createdAt: page.created_time,
    lastUpdated: page.last_edited_time,
  };
}

function initializeMarkdownConverter(
  notion: Client,
  id_to_slug: IdToSlugMap,
  jobTracker: JobTracker
): NotionToMarkdown {
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
          properties: processProperties(item.properties),
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
      jobTracker.debug(`Could not fetch database entries for ${id}:`, error);
      return createDatabaseTable(title, [], []);
    }
  });

  // Custom transformer for child_page blocks
  n2m.setCustomTransformer("child_page", async (block) => {
    const childPageBlock = block as any;
    const childPageId = block.id;
    const childPageTitle = childPageBlock.child_page?.title || "Untitled Page";

    if (id_to_slug[childPageId]) {
      return `[${childPageTitle}](${id_to_slug[childPageId].slug})`;
    }
    return `[${childPageTitle}](notion://page/${childPageId})`;
  });

  // Custom transformer for link_to_page blocks
  n2m.setCustomTransformer("link_to_page", async (block) => {
    const linkToPage = block as any;
    const pageId = linkToPage.link_to_page?.page_id;

    if (pageId && id_to_slug[pageId]) {
      return `[${id_to_slug[pageId].name}](${id_to_slug[pageId].slug})`;
    }
    return false; // Return false for default behavior
  });

  return n2m;
}

export async function indexNotionPages(
  notionToken: string,
  db_path: string,
  jobTracker: JobTracker
) {
  try {
    jobTracker.info(`Starting Notion indexing job: ${jobTracker.getJobId()}`);
    jobTracker.updateStatus("PROCESSING");

    const notion = new Client({ auth: notionToken });
    const db = initialise_db(db_path);

    // Rate limit to 2 concurrent requests for Notion API
    const limit = pLimit(2);

    jobTracker.info("Fetching all pages from Notion...");
    // 1. Fetch all pages
    const { databaseChildren, regularPages } = await fetchAllPages(notion, jobTracker);
    jobTracker.info(
      `Found ${regularPages.length} regular pages and ${databaseChildren.length} database children`
    );

    jobTracker.info("Fetching all databases from Notion...");
    const databases = await fetchAllDatabases(notion, jobTracker);
    jobTracker.info(`Found ${databases.length} databases`);

    // 2. Slugify the pages
    jobTracker.info("Generating slugs...");
    const id_to_slug = generateSlugs(regularPages, databases);

    jobTracker.info("Converting regular pages to markdown...");
    const conversionPromises = regularPages.map((page) =>
      limit(() => convertPageToMarkdown(notion, page, id_to_slug, jobTracker))
    );

    const convertedPages = await Promise.all(conversionPromises);
    jobTracker.info(`Converted ${convertedPages.length} regular pages`);

    // 4. Insert databases
    jobTracker.info("Inserting databases into database...");
    insertDatabases(db, databases, id_to_slug);

    jobTracker.info("Converting database pages to markdown...");
    const conversionDatabasePromises = databaseChildren.map((child) =>
      limit(() => convertDatabasePageToMarkdown(notion, child, id_to_slug, jobTracker))
    );

    const convertedDatabasePages = await Promise.all(
      conversionDatabasePromises
    );
    jobTracker.info(
      `Converted ${convertedDatabasePages.length} database pages`
    );

    jobTracker.info("Inserting pages into database...");
    insertPages(db, convertedPages);

    jobTracker.info("Inserting database pages into database...");
    insertDatabasePages(db, convertedDatabasePages);

    jobTracker.updateStatus("END");
    jobTracker.info(
      `Indexing job completed successfully: ${jobTracker.getJobId()}`
    );

    return jobTracker.getJobId();
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    jobTracker.error(`Indexing job failed: ${errorMessage}`, error);
    jobTracker.updateStatus("ERROR", errorMessage);
    throw error;
  }
}
