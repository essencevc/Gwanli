#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { exec } from "child_process";
import { promisify } from "util";
import { listFiles, indexNotionPages } from "gwanli-core";

const execAsync = promisify(exec);

// Create an MCP server
const server = new McpServer({
  name: "demo-server",
  version: "1.0.0",
});

// Add auth tool
server.registerTool(
  "auth",
  {
    description:
      "Verify your Notion API key is set up correctly or provision a new one in the event it is not set up correctly",
    inputSchema: {},
  },
  async () => {
    const notionApiKey = process.env.NOTION_API_KEY;

    if (notionApiKey) {
      return {
        content: [
          {
            type: "text",
            text: "User already authenticated, NOTION_API_KEY has been set",
          },
        ],
      };
    }

    try {
      // Open browser to authentication URL
      const url = "https://worker.ivanleomk9297.workers.dev";
      await execAsync(`open "${url}"`);
      return {
        content: [
          {
            type: "text",
            text: `Opening browser to ${url} for authentication`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Please visit https://worker.ivanleomk9297.workers.dev to authenticate`,
          },
        ],
      };
    }
  }
);

// Add ls tool
server.registerTool(
  "ls",
  {
    description: "List all files in the Notion workspace in a tree structure",
    inputSchema: {
      dbPath: z
        .string()
        .optional()
        .describe(
          "Path to the SQLite database file (defaults to ~/gwanli/notion.db)"
        ),
      prefix: z
        .string()
        .optional()
        .describe("Filter files by prefix/slug (defaults to /)"),
      maxDepth: z
        .number()
        .optional()
        .describe("Maximum depth to display (default: 2)"),
    },
  },
  async (args) => {
    const dbPath = args.dbPath || "~/gwanli/notion.db";
    const prefix = args.prefix || "/";
    const maxDepth = args.maxDepth || 2;

    try {
      const tree = listFiles(dbPath, prefix, maxDepth);
      return {
        content: [
          {
            type: "text",
            text: tree,
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: "text",
            text: `Error listing files: ${error.message}`,
          },
        ],
      };
    }
  }
);

// Add index tool
server.registerTool(
  "index",
  {
    description: "Index pages from your Notion workspace into a local database",
    inputSchema: {
      token: z
        .string()
        .optional()
        .describe("Notion integration token (uses NOTION_API_KEY env var if not provided)"),
      dbPath: z
        .string()
        .optional()
        .describe("Path to the SQLite database file (defaults to ~/.notion.db)"),
    },
  },
  async (args) => {
    const token = args.token || process.env.NOTION_API_KEY;
    const dbPath = args.dbPath || "~/gwanli/notion.db";

    if (!token) {
      return {
        content: [
          {
            type: "text",
            text: "Error: Notion token is required. Provide it via the token parameter or set NOTION_API_KEY environment variable.",
          },
        ],
      };
    }

    try {
      await indexNotionPages(token, dbPath);
      return {
        content: [
          {
            type: "text",
            text: `Successfully indexed Notion pages to database at ${dbPath}`,
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: "text",
            text: `Error indexing pages: ${error.message}`,
          },
        ],
      };
    }
  }
);

// Start receiving messages on stdin and sending messages on stdout
const transport = new StdioServerTransport();
await server.connect(transport);
