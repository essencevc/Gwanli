#!/usr/bin/env node

import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { exec } from "child_process";
import { promisify } from "util";

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
      "Authenticate user by opening browser for API key setup or showing current status",
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

// Start receiving messages on stdin and sending messages on stdout
const transport = new StdioServerTransport();
await server.connect(transport);
