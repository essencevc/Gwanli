import { Client } from "@notionhq/client";
import { NotionToMarkdown } from "notion-to-md";
import { z } from "zod";

export interface NotionPage {
  id: string;
  title: string;
  content?: string;
  lastUpdated: string;
}

export interface NotionDatabasePage {
  id: string;
  title?: string;
  content?: string;
  lastUpdated: string;
  database_order?: number;
}

export const DatabasePageSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  content: z.string().default(""),
  lastUpdated: z.string(),
  database_order: z.number().int().optional()
});

export interface FetchResult {
  pages: NotionPage[];
  databases: string[];
}

export interface NotionDatabase {
  id: string;
  title?: string;
  lastUpdated: string;
  properties: Record<string, any>;
}

export async function convertPageToMarkdown(
  notion: Client,
  pageId: string
): Promise<string> {
  const n2m = new NotionToMarkdown({ notionClient: notion });

  try {
    const mdblocks = await n2m.pageToMarkdown(pageId);
    return n2m.toMarkdownString(mdblocks).parent;
  } catch (error) {
    console.error(`Failed to convert page ${pageId} to markdown:`, error);
    return "";
  }
}

export async function fetchDatabaseChildren(
  notion: Client,
  databaseId: string
): Promise<NotionDatabasePage[]> {
  const children: NotionDatabasePage[] = [];
  let hasMore = true;
  let nextCursor: string | null = null;
  let order = 0;

  while (hasMore) {
    const response = await notion.databases.query({
      database_id: databaseId,
      start_cursor: nextCursor || undefined,
      sorts: [
        {
          property: "Name",
          direction: "ascending"
        }
      ]
    });

    for (const page of response.results as any[]) {
      const title = page.properties?.Name?.title?.[0]?.plain_text;
      
      children.push({
        id: page.id,
        title,
        content: "",
        lastUpdated: page.last_edited_time,
        database_order: order++
      });
    }

    hasMore = response.has_more;
    nextCursor = response.next_cursor;
  }

  return children;
}

export async function fetchDatabaseInfo(
  notion: Client,
  databaseIds: string[]
): Promise<NotionDatabase[]> {
  const databases: NotionDatabase[] = [];

  for (const databaseId of databaseIds) {
    try {
      const database = await notion.databases.retrieve({
        database_id: databaseId,
      });

      const title = (database as any).title?.[0]?.plain_text || "";
      
      databases.push({
        id: database.id,
        title,
        lastUpdated: (database as any).last_edited_time,
        properties: (database as any).properties,
      });
    } catch (error) {
      console.error(`Error fetching database ${databaseId}:`, error);
    }
  }

  return databases;
}

export async function fetchNotionData(
  notion: Client,
  offset?: string
): Promise<FetchResult> {
  const pages: NotionPage[] = [];
  const databases = new Set<string>();
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

    // Process each page and separate by parent type
    for (const page of response.results as any[]) {
      const has_database_parent = page.parent?.type === "database_id";

      if (has_database_parent) {
        // Add database ID to set
        databases.add(page.parent.database_id);
      } else {
        // For non-database parents, title is in properties.title
        const title = page.properties?.title?.title?.[0]?.plain_text;
        
        // Add to regular pages
        pages.push({
          id: page.id,
          title,
          content: "",
          lastUpdated: page.last_edited_time,
        });
      }
    }

    hasMore = response.has_more;
    cursor = response.next_cursor || undefined;
  }

  return { pages, databases: Array.from(databases) };
}
