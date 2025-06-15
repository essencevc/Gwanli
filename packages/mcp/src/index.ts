#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
  name: "echo-mcp-server",
  version: "0.1.0",
});

server.tool(
  "echo",
  { text: z.string().describe("Text to echo back") },
  async ({ text }) => ({
    content: [{ type: "text", text: `Echo: ${text}` }],
  })
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Echo MCP server running on stdio");
}

main().catch(console.error);
