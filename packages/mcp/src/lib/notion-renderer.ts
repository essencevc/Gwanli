import { NotionToMarkdown } from "notion-to-md";
import { Client } from "@notionhq/client";
import { addDatabaseTransformer } from "./notion-database-transformer.js";

export async function renderNotionPageWithDatabases(
  pageId: string,
  notionToken: string
): Promise<string> {
  const notion = new Client({ auth: notionToken }) as any;
  const n2m = new NotionToMarkdown({ notionClient: notion });
  
  // Add the database transformer
  addDatabaseTransformer(n2m, notion);
  
  // Convert page to markdown with database support
  const mdBlocks = await n2m.pageToMarkdown(pageId);
  const result = n2m.toMarkdownString(mdBlocks);
  return typeof result === 'string' ? result : result.parent;
}
