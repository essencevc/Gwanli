#!/usr/bin/env bun

import { Client } from '@notionhq/client';
import { z } from 'zod';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Environment validation
const envSchema = z.object({
  NOTION_TOKEN: z.string().min(1, 'NOTION_TOKEN is required'),
});

// Page content schema
const pageSchema = z.object({
  id: z.string(),
  properties: z.record(z.any()),
  created_time: z.string(),
  last_edited_time: z.string(),
});

async function downloadNotionPages() {
  // Validate environment
  const env = envSchema.safeParse(process.env);
  if (!env.success) {
    console.error('Environment validation failed:', env.error.issues);
    console.error('Please set NOTION_TOKEN environment variable');
    process.exit(1);
  }

  const notion = new Client({
    auth: env.data.NOTION_TOKEN,
  });

  try {
    // Create data directory if it doesn't exist
    const dataDir = join(__dirname, '..', 'data');
    await mkdir(dataDir, { recursive: true });

    console.log('Fetching accessible pages...');
    
    // Search for all pages the user has access to
    const response = await notion.search({
      filter: {
        property: 'object',
        value: 'page',
      },
      sort: {
        direction: 'descending',
        timestamp: 'last_edited_time',
      },
    });

    console.log(`Found ${response.results.length} pages`);

    for (const page of response.results) {
      if (page.object !== 'page') continue;

      const validatedPage = pageSchema.safeParse(page);
      if (!validatedPage.success) {
        console.warn(`Skipping invalid page:`, validatedPage.error.issues);
        continue;
      }

      const pageData = validatedPage.data;
      console.log(`Processing page: ${pageData.id}`);

      try {
        // Get page content blocks
        const blocks = await notion.blocks.children.list({
          block_id: pageData.id,
        });

        // Convert to markdown
        const markdown = await convertBlocksToMarkdown(blocks.results, notion);
        
        // Get page title
        const title = extractPageTitle(pageData.properties);
        
        // Create markdown content with metadata
        const fullMarkdown = createMarkdownDocument(pageData, title, markdown);

        // Save to file
        const filename = `${pageData.id}.md`;
        const filepath = join(dataDir, filename);
        await writeFile(filepath, fullMarkdown, 'utf-8');

        console.log(`✓ Saved: ${filename} (${title})`);
      } catch (error) {
        console.error(`✗ Failed to process page ${pageData.id}:`, error);
      }
    }

    console.log('\nDownload complete!');
  } catch (error) {
    console.error('Failed to download pages:', error);
    process.exit(1);
  }
}

function extractPageTitle(properties: Record<string, any>): string {
  // Look for title property
  for (const [key, value] of Object.entries(properties)) {
    if (value?.type === 'title' && value?.title?.length > 0) {
      return value.title.map((t: any) => t.plain_text).join('');
    }
  }
  return 'Untitled';
}

function createMarkdownDocument(page: any, title: string, content: string): string {
  const metadata = {
    id: page.id,
    title: title,
    created: page.created_time,
    lastEdited: page.last_edited_time,
  };

  return `---
id: ${metadata.id}
title: "${metadata.title}"
created: ${metadata.created}
lastEdited: ${metadata.lastEdited}
---

# ${metadata.title}

${content}
`;
}

async function convertBlocksToMarkdown(blocks: any[], notion: Client): Promise<string> {
  const markdown: string[] = [];

  for (const block of blocks) {
    const blockMarkdown = await convertBlockToMarkdown(block, notion);
    if (blockMarkdown) {
      markdown.push(blockMarkdown);
    }
  }

  return markdown.join('\n\n');
}

async function convertBlockToMarkdown(block: any, notion: Client): Promise<string> {
  const { type, id } = block;

  // Handle nested blocks
  let content = '';
  let nestedContent = '';

  if (block.has_children) {
    try {
      const children = await notion.blocks.children.list({ block_id: id });
      nestedContent = await convertBlocksToMarkdown(children.results, notion);
    } catch (error) {
      console.warn(`Failed to fetch children for block ${id}:`, error);
    }
  }

  switch (type) {
    case 'paragraph':
      content = extractRichText(block.paragraph?.rich_text || []);
      break;
    
    case 'heading_1':
      content = `# ${extractRichText(block.heading_1?.rich_text || [])}`;
      break;
    
    case 'heading_2':
      content = `## ${extractRichText(block.heading_2?.rich_text || [])}`;
      break;
    
    case 'heading_3':
      content = `### ${extractRichText(block.heading_3?.rich_text || [])}`;
      break;
    
    case 'bulleted_list_item':
      content = `- ${extractRichText(block.bulleted_list_item?.rich_text || [])}`;
      break;
    
    case 'numbered_list_item':
      content = `1. ${extractRichText(block.numbered_list_item?.rich_text || [])}`;
      break;
    
    case 'to_do':
      const checked = block.to_do?.checked ? '[x]' : '[ ]';
      content = `${checked} ${extractRichText(block.to_do?.rich_text || [])}`;
      break;
    
    case 'code':
      const language = block.code?.language || '';
      const code = extractRichText(block.code?.rich_text || []);
      content = `\`\`\`${language}\n${code}\n\`\`\``;
      break;
    
    case 'quote':
      content = `> ${extractRichText(block.quote?.rich_text || [])}`;
      break;
    
    case 'divider':
      content = '---';
      break;
    
    default:
      // For unsupported block types, try to extract any text content
      const textContent = extractRichText(block[type]?.rich_text || []);
      if (textContent) {
        content = `*[${type}]* ${textContent}`;
      }
  }

  // Combine content with nested content
  if (nestedContent) {
    const indentedNested = nestedContent.split('\n').map(line => `  ${line}`).join('\n');
    return content ? `${content}\n${indentedNested}` : indentedNested;
  }

  return content;
}

function extractRichText(richText: any[]): string {
  return richText.map(text => {
    let content = text.plain_text || '';
    
    // Apply formatting
    if (text.annotations?.bold) content = `**${content}**`;
    if (text.annotations?.italic) content = `*${content}*`;
    if (text.annotations?.strikethrough) content = `~~${content}~~`;
    if (text.annotations?.code) content = `\`${content}\``;
    
    // Handle links
    if (text.href) content = `[${content}](${text.href})`;
    
    return content;
  }).join('');
}

// Run the script
if (import.meta.main) {
  downloadNotionPages().catch(console.error);
}
