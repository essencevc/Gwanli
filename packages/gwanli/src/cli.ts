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
  .option("-d, --db <dbPath>", "Path to the SQLite database file")
  .action(async (options) => {
    const token = options.token || process.env.NOTION_API_KEY;
    const dbPath = options.db || "./notion.db";

    if (!token) {
      console.error(
        "Error: Notion token is required. Provide it via --token option or NOTION_API_KEY environment variable."
      );
      process.exit(1);
    }

    await indexNotionPages(token, dbPath);
  });

program.parse();
