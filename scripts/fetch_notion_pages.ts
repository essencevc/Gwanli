import { Client } from "@notionhq/client";
import {
  PageObjectResponse,
  DatabaseObjectResponse,
  BlockObjectResponse,
} from "@notionhq/client/build/src/api-endpoints";
import { z } from "zod";
import { NotionToMarkdown } from "notion-to-md";

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

const PageDataSchema = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string(),
  archived: z.boolean(),
  parent_id: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

type PageData = z.infer<typeof PageDataSchema>;

function extractPageData(page: PageObjectResponse): PageData {
  // Extract title from properties
  const titleProperty = page.properties.title;
  let title = "Untitled";
  if (
    titleProperty &&
    titleProperty.type === "title" &&
    titleProperty.title.length > 0
  ) {
    title = titleProperty.title[0].plain_text;
  }

  // Extract parent_id
  let parent_id: string | null = null;
  if (page.parent.type === "page_id") {
    parent_id = page.parent.page_id;
  } else if (page.parent.type === "workspace") {
    parent_id = null; // workspace pages have no parent
  }

  const pageData: PageData = {
    id: page.id,
    title,
    url: page.url,
    archived: page.archived,
    parent_id,
    created_at: page.created_time,
    updated_at: page.last_edited_time,
  };

  return PageDataSchema.parse(pageData);
}

async function fetchAllPages(): Promise<PageObjectResponse[]> {
  const pages: PageObjectResponse[] = [];
  let hasMore = true;
  let nextCursor: string | undefined;

  while (hasMore) {
    try {
      const response = await notion.search({
        filter: {
          property: "object",
          value: "page",
        },
        sort: {
          direction: "descending",
          timestamp: "last_edited_time",
        },
        start_cursor: nextCursor,
        page_size: 100,
      });

      const pageResults = response.results.filter(
        (result): result is PageObjectResponse => {
          if (result.object !== "page") return false;
          const page = result as PageObjectResponse;
          return page.parent?.type !== "database_id";
        }
      );

      pages.push(...pageResults);
      hasMore = response.has_more;
      nextCursor = response.next_cursor || undefined;

      console.log(
        `Fetched ${pageResults.length} pages (total: ${pages.length})`
      );
    } catch (error) {
      console.error("Error fetching pages:", error);
      throw error;
    }
  }

  return pages;
}

function addDatabaseTransformer(n2m: NotionToMarkdown, notion: Client) {
  n2m.setCustomTransformer("child_database", async (block) => {
    try {
      // Get database info
      const databaseId = block.id;
      const database = await notion.databases.retrieve({ database_id: databaseId });
      
      // Get first 3 rows
      const response = await notion.databases.query({
        database_id: databaseId,
        page_size: 3,
      });

      const title = (database as any).title?.[0]?.plain_text || "Untitled Database";
      
      // Build XML output
      let xml = `<database id="${databaseId}" title="${title}">\n`;
      
      // Add property headers
      const properties = Object.entries(database.properties);
      xml += "  <properties>\n";
      properties.forEach(([name, prop]) => {
        xml += `    <property name="${name}" type="${prop.type}" />\n`;
      });
      xml += "  </properties>\n";
      
      // Add rows
      xml += "  <rows>\n";
      response.results.forEach((page: any, index) => {
        xml += `    <row id="${page.id}" index="${index}">\n`;
        
        Object.entries(page.properties).forEach(([propName, propValue]: [string, any]) => {
          let value = "";
          switch (propValue.type) {
            case "title":
              value = propValue.title?.[0]?.plain_text || "";
              break;
            case "rich_text":
              value = propValue.rich_text?.[0]?.plain_text || "";
              break;
            case "number":
              value = propValue.number?.toString() || "";
              break;
            case "select":
              value = propValue.select?.name || "";
              break;
            case "multi_select":
              value = propValue.multi_select?.map((s: any) => s.name).join(", ") || "";
              break;
            case "date":
              value = propValue.date?.start || "";
              break;
            case "checkbox":
              value = propValue.checkbox?.toString() || "";
              break;
            default:
              value = JSON.stringify(propValue[propValue.type]) || "";
          }
          xml += `      <cell property="${propName}">${value}</cell>\n`;
        });
        
        xml += "    </row>\n";
      });
      xml += "  </rows>\n";
      xml += "</database>";
      
      return xml;
    } catch (error) {
      console.error("Error rendering database:", error);
      return `<database id="${block.id}" error="Failed to render database" />`;
    }
  });
}

async function renderPageWithDatabases(pageId: string): Promise<string> {
  const n2m = new NotionToMarkdown({ notionClient: notion });
  
  // Add the database transformer
  addDatabaseTransformer(n2m, notion);
  
  // Convert page to markdown with database support
  const mdBlocks = await n2m.pageToMarkdown(pageId);
  const mdString = n2m.toMarkdownString(mdBlocks);
  return mdString.parent;
}

async function main() {
  if (!process.env.NOTION_API_KEY) {
    console.error("NOTION_API_KEY environment variable is required");
    process.exit(1);
  }

  try {
    // Test the fetchDatabaseById function with the specific database ID
    const testDatabaseId = "232730a8-3bea-8042-a2aa-fffb637948ae";
    console.log(`Fetching database ${testDatabaseId} details...`);
    const database = await fetchDatabaseById(testDatabaseId);

    // Get all pages in the database
    console.log(`\nFetching pages from database ${testDatabaseId}...`);
    const databasePages = await getDatabasePages(testDatabaseId);

    // Test database rendering - find a page that contains databases
    console.log("\nTesting database rendering...");
    const pages = await fetchAllPages();
    
    // Find a page that might contain databases and render it
    if (pages.length > 0) {
      const testPageId = pages[0].id;
      console.log(`Rendering page ${testPageId} with database support...`);
      const markdown = await renderPageWithDatabases(testPageId);
      console.log("\nRendered markdown with databases:");
      console.log(markdown);
    }

    console.log("\nExtracted page data:");
    pages.forEach((page) => {
      const pageData = extractPageData(page);
      console.log(JSON.stringify(pageData, null, 2));
    });
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

async function checkPageForDatabases(pageId: string): Promise<any[]> {
  try {
    const response = await notion.blocks.children.list({
      block_id: pageId,
      page_size: 100,
    });

    const databases: any[] = [];

    for (const block of response.results) {
      if (
        block.object === "block" &&
        (block as BlockObjectResponse).type === "child_database"
      ) {
        // Fetch full database details
        const databaseResponse = await notion.databases.retrieve({
          database_id: block.id,
        });
        console.log(
          `\nDatabase ${block.id} details:`,
          JSON.stringify(databaseResponse, null, 2)
        );
        databases.push(databaseResponse);
      }
    }

    return databases;
  } catch (error) {
    console.error(`Error checking page ${pageId} for databases:`, error);
    throw error;
  }
}

async function fetchDatabaseById(databaseId: string): Promise<any> {
  try {
    const databaseResponse = await notion.databases.retrieve({
      database_id: databaseId,
    });
    console.log(
      `\nDatabase ${databaseId} details:`,
      JSON.stringify(databaseResponse, null, 2)
    );
    return databaseResponse;
  } catch (error) {
    console.error(`Error fetching database ${databaseId}:`, error);
    throw error;
  }
}

async function getDatabasePages(
  databaseId: string
): Promise<PageObjectResponse[]> {
  try {
    const pages: PageObjectResponse[] = [];
    let hasMore = true;
    let nextCursor: string | undefined;

    while (hasMore) {
      const response = await notion.databases.query({
        database_id: databaseId,
        start_cursor: nextCursor,
        page_size: 100,
      });

      const pageResults = response.results.filter(
        (result): result is PageObjectResponse => result.object === "page"
      );

      pages.push(...pageResults);
      hasMore = response.has_more;
      nextCursor = response.next_cursor || undefined;

      console.log(
        `Fetched ${pageResults.length} pages from database (total: ${pages.length})`
      );
    }

    console.log(`\nDatabase ${databaseId} contains ${pages.length} pages:`);
    pages.forEach((page, index) => {
      const pageData = extractPageData(page);
      console.log(`${index + 1}. ${pageData.title} (${pageData.id})`);
    });

    return pages;
  } catch (error) {
    console.error(`Error fetching pages from database ${databaseId}:`, error);
    throw error;
  }
}

// Example usage:
// console.log(await getDatabasePages("232730a8-3bea-8042-a2aa-fffb637948ae"));

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
