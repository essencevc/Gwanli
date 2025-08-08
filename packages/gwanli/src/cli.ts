#!/usr/bin/env node

import { Command } from "commander";
import { indexNotionPages } from "gwanli-core";
import { exec } from "child_process";

const program = new Command("gwanli");

program
  .name("gwanli")
  .description("Gwanli - Notion management CLI")
  .version("0.2.0");

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

program
  .command("auth")
  .description("Interactively generate a Notion API token")
  .action(async () => {
    console.log("\n🔐 Notion API Token Generator");
    console.log(
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    );
    console.log("\n🚀 Opening authentication page in your browser...");

    const workerUrl = "https://worker.ivanleomk9297.workers.dev";

    // Open URL in default browser
    const openCommand =
      process.platform === "darwin"
        ? "open"
        : process.platform === "win32"
        ? "start"
        : "xdg-open";

    exec(`${openCommand} ${workerUrl}`, (error) => {
      if (error) {
        console.log(
          `\n❌ Could not open browser automatically. Please visit: ${workerUrl}`
        );
      } else {
        console.log(`\n✅ Browser opened to: ${workerUrl}`);
      }
    });

    console.log("\nAfter completing authentication:");
    console.log("1. Copy the generated token");
    console.log("2. Set it as an environment variable:");
    console.log("   export NOTION_API_KEY=your_token_here");
    console.log(
      "\nAlternatively, you can use the --token option with any gwanli command."
    );
    console.log(
      "\n💡 For more details about the worker, check: ./worker/index.ts"
    );
    console.log(
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    );
  });

program.parse();
