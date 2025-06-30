import { Client } from '@notionhq/client';
import { NotionToMarkdown } from 'notion-to-md';
import { z } from 'zod';

// Input validation schema
const notionPageToMarkdownSchema = z.object({
  pageId: z.string().min(1, 'Page ID is required'),
  notionToken: z.string().min(1, 'Notion token is required'),
});

export type NotionPageToMarkdownInput = z.infer<typeof notionPageToMarkdownSchema>;

/**
 * Converts a Notion page to markdown format
 * @param params - The page ID and Notion token
 * @returns Promise<string> - The markdown representation of the page
 */
export async function convertNotionPageToMarkdown(
  params: NotionPageToMarkdownInput
): Promise<string> {
  // Validate inputs
  const validatedParams = notionPageToMarkdownSchema.parse(params);
  const { pageId, notionToken } = validatedParams;

  // Initialize Notion client
  const notion = new Client({
    auth: notionToken,
  });

  // Initialize NotionToMarkdown converter
  const n2m = new NotionToMarkdown({ notionClient: notion });

  try {
    // Get the page blocks
    const mdblocks = await n2m.pageToMarkdown(pageId);
    
    // Convert blocks to markdown string
    const mdString = n2m.toMarkdownString(mdblocks);
    
    return mdString.parent;
  } catch (error) {
    throw new Error(`Failed to convert Notion page to markdown: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
