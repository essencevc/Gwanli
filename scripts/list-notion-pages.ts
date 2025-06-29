#!/usr/bin/env bun

import { Client } from "@notionhq/client";
import { z } from "zod";
import { convertNotionPageToMarkdown } from "../packages/mcp/src/lib/notion-to-markdown";
import { writeFileSync } from "fs";

// Environment validation
const envSchema = z.object({
  NOTION_TOKEN: z.string().min(1, "NOTION_TOKEN is required"),
});

async function listNotionPages() {
  // Validate environment
  const env = envSchema.safeParse(process.env);
  if (!env.success) {
    console.error("Environment validation failed:", env.error.issues);
    console.error("Please set NOTION_TOKEN environment variable");
    process.exit(1);
  }

  const notion = new Client({
    auth: env.data.NOTION_TOKEN,
  });

  try {
    console.log("Fetching accessible pages...");

    // Search for all pages the user has access to
    const response = await notion.search({
      filter: {
        property: "object",
        value: "page",
      },
      sort: {
        direction: "descending",
        timestamp: "last_edited_time",
      },
    });

    console.log(`\nFound ${response.results.length} pages:\n`);

    for (const page of response.results) {
      if (page.object !== "page") continue;

      // Extract page title
      let title = "Untitled";
      if ("properties" in page && page.properties) {
        for (const [key, value] of Object.entries(page.properties)) {
          if (value?.type === "title" && value?.title?.length > 0) {
            title = value.title.map((t: any) => t.plain_text).join("");
            break;
          }
        }
      }

      const result = await convertNotionPageToMarkdown({
        pageId: page.id,
        notionToken: env.data.NOTION_TOKEN,
      });

      writeFileSync(`./pages/${page.id}.md`, result);

      console.log(result);

      console.log(`${page.id} - ${title}`);
    }
  } catch (error) {
    console.error("Failed to fetch pages:", error);
    process.exit(1);
  }
}

// Run the script
if (import.meta.main) {
  listNotionPages().catch(console.error);
}
