#!/usr/bin/env node

import { Command } from "commander";
import { helloGwanli, indexNotionPages } from "gwanli-core";

const program = new Command("gwanli");

program
  .name("gwanli")
  .description("Gwanli - Notion management CLI")
  .version("0.1.0");

program
  .command("hello")
  .description("Say hello from Gwanli")
  .action(() => {
    console.log(helloGwanli());
  });

program
  .command("index")
  .description("Index pages from your Notion workspace")
  .option("-t, --token <token>", "Notion integration token")
  .option(
    "-d, --database <databaseId>",
    "Specific database ID to index (optional)"
  )
  .action(async (options) => {
    const token = options.token || process.env.NOTION_API_KEY;
    const dbPath = process.env.SQLITE_DB || "./notion.db";

    if (!token) {
      console.error(
        "Error: Notion token is required. Provide it via --token option or NOTION_API_KEY environment variable."
      );
      process.exit(1);
    }

    await indexNotionPages(token, dbPath);

    // try {
    //   console.log("Indexing Notion pages...");
    //   const pages = await indexNotionPages(token, dbPath);

    //   console.log(`\nFound ${pages.length} pages:\n`);
    //   pages.forEach((page, index) => {
    //     console.log(`${index + 1}. ${page.title}`);
    //     console.log(`   ID: ${page.id}`);
    //     console.log(`   URL: ${page.url}`);
    //     console.log(
    //       `   Created: ${new Date(page.created_time).toLocaleDateString()}`
    //     );
    //     console.log(
    //       `   Last edited: ${new Date(
    //         page.last_edited_time
    //       ).toLocaleDateString()}`
    //     );
    //     console.log();
    //   });
    // } catch (error) {
    //   console.error(
    //     "Error:",
    //     error instanceof Error ? error.message : "Unknown error occurred"
    //   );
    //   process.exit(1);
    // }
  });

program.parse();
