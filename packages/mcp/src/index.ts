#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { generate_plan } from "./lib/plan";

const server = new McpServer({
  name: "vibe-all-coding",
  version: "0.1.0",
});

server.tool(
  "echo",
  { text: z.string().describe("Text to echo back") },
  async ({ text }) => ({
    content: [{ type: "text", text: `Echo: ${text}` }],
  })
);

server.tool(
  "suggest_issues",
  {
    taskDescription: z
      .string()
      .describe("The task or feature request to break down into issues"),
    context: z
      .string()
      .optional()
      .describe("Additional context about the codebase or project"),
  },
  async ({ taskDescription, context = "" }) => {
    const plan = await generate_plan(taskDescription, context);
    return {
      content: [{ type: "text", text: plan }],
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Vibe All Coding MCP server running on stdio");
}

main().catch(console.error);
